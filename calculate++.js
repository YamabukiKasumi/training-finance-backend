// calculate-portfolio-value-with-returns.js
const axios = require('axios');
const mysql = require('mysql2/promise');

// 1. 加载配置
const config = require('./config'); // 确保 config.js 路径正确

// API 配置 (使用多股票报价接口)
const { host: apiHost, key: apiKey } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const QUOTES_ENDPOINT = config.api.endpoints.quotes; // 确保 config.js 中定义了 quotes 端点
const API_URL = `${BASE_URL}${QUOTES_ENDPOINT}`;

// 数据库配置
const dbConfig = config.db;

// --- 辅助函数 ---

/**
 * 从数据库获取所有用户持仓 (包含买入时间)
 * @returns {Promise<Array<{symbol: string, quantity: number, purchase_timestamp_unix: number}>>} 持仓数组
 */
async function fetchAllHoldings() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 已连接到数据库 (获取持仓)');

        // 查询持仓信息，包括买入时间戳
        const [rows] = await connection.execute(
            'SELECT symbol, quantity, purchase_timestamp_unix FROM user_stock_holdings_new WHERE purchase_timestamp_unix IS NOT NULL'
        );
        console.log(`📚 从数据库获取到 ${rows.length} 条有效持仓记录 (已过滤无买入时间的记录)`);
        return rows;

    } catch (error) {
        console.error('❌ 从数据库获取持仓失败:', error.message);
        throw error; // 重新抛出错误，让主函数处理
    } finally {
        if (connection) {
            try {
                await connection.end();
                console.log('🔒 数据库连接已关闭 (获取持仓)');
            } catch (closeError) {
                console.error('⚠️ 关闭数据库连接时出错:', closeError.message);
            }
        }
    }
}

/**
 * 从 stock_history 表中查询指定股票在指定时间的收盘价
 * @param {string} symbol 股票代码
 * @param {number} purchaseTimestampUnix 买入时间戳 (Unix timestamp in seconds)
 * @returns {Promise<number|null>} 收盘价或 null (如果未找到)
 */
async function fetchPurchasePrice(symbol, purchaseTimestampUnix) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        // console.log(`🔍 查询 ${symbol} 在时间戳 ${purchaseTimestampUnix} 的买入价...`); // 可选日志

        // 为了匹配到最接近买入日期的收盘价，我们查找 data_timestamp_unix 小于等于买入时间戳的最新记录
        // 假设 stock_history 中存储的是日线数据，data_timestamp_unix 是当天 UTC 00:00 的时间戳
        const [rows] = await connection.execute(
            `SELECT close_price FROM stock_history 
             WHERE symbol = ? AND data_timestamp_unix <= ? 
             ORDER BY data_timestamp_unix DESC 
             LIMIT 1`,
            [symbol, purchaseTimestampUnix]
        );

        if (rows.length > 0) {
            // console.log(`✅ 找到 ${symbol} 的买入价: $${rows[0].close_price}`); // 可选日志
            const price = parseFloat(rows[0].close_price);
            if (isNaN(price)) {
                console.warn(`⚠️ ${symbol} 的买入价 '${rows[0].close_price}' 无法转换为有效数字`);
                return null;
            }
            return price;
        } else {
            console.warn(`⚠️ 未在 stock_history 中找到 ${symbol} 在时间戳 ${purchaseTimestampUnix} 或之前的收盘价`);
            return null;
        }

    } catch (error) {
        console.error(`❌ 查询 ${symbol} 买入价失败:`, error.message);
        return null; // 返回 null 允许程序继续处理其他股票
    } finally {
        if (connection) {
            try {
                await connection.end();
                // console.log('🔒 数据库连接已关闭 (查询买入价)'); // 可选日志
            } catch (closeError) {
                console.error('⚠️ 关闭数据库连接时出错:', closeError.message);
            }
        }
    }
}


/**
 * 从 API 获取指定股票的当前价格
 * @param {Array<string>} symbols 股票代码数组
 * @returns {Promise<Map<string, number>>} 一个 Map，键为 symbol，值为 regularMarketPrice
 */
async function fetchCurrentPrices(symbols) {
    if (!symbols || symbols.length === 0) {
        console.log('⚠️ 没有股票代码需要查询价格');
        return new Map();
    }

    try {
        console.log(`🔍 正在从 API 获取股票价格: ${symbols.join(', ')}`);
        const response = await axios.get(API_URL, {
            params: { ticker: symbols.join(',') },
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': apiHost,
            },
            timeout: 15000
        });

        const pricesMap = new Map();
        if (response.data && response.data.body && Array.isArray(response.data.body)) {
            response.data.body.forEach(stock => {
                if (stock.symbol && stock.regularMarketPrice !== undefined) {
                    pricesMap.set(stock.symbol, stock.regularMarketPrice);
                } else {
                    console.warn(`⚠️ 股票数据不完整或缺少价格: ${stock.symbol || 'Unknown Symbol'}`);
                }
            });
            console.log(`✅ 成功从 API 获取到 ${pricesMap.size} 只股票的价格`);
        } else {
            console.error('❌ API 返回数据结构不符合预期');
        }
        return pricesMap;

    } catch (error) {
        console.error(`❌ 从 API 获取价格失败:`, error.message);
        if (error.response) {
            console.error('  状态码:', error.response.status);
        }
        // 返回空 Map，允许程序继续计算有价格的股票
        return new Map();
    }
}

/**
 * 计算投资组合总价值和收益率
 * @param {Array<{symbol: string, quantity: number, purchase_timestamp_unix: number}>} holdings 持仓数据
 * @returns {Object} 包含详细信息和总计的 JSON 对象
 */
async function calculatePortfolioReturns(holdings) {
    console.log('\n🧮 正在计算投资组合价值和收益率...');
    
    if (holdings.length === 0) {
        return {
            calculationTime: new Date().toISOString(),
            message: "没有持仓记录或持仓记录缺少买入时间",
            totalCostBasis: 0,
            totalMarketValue: 0,
            totalProfit: 0,
            totalReturnPercent: 0,
            holdings: []
        };
    }

    // 1. 收集所有需要查询当前价格的股票代码
    const symbols = holdings.map(h => h.symbol);
    console.log(`📋 需要查询当前价格的股票: ${symbols.join(', ')}`);

    // 2. 获取当前价格
    const currentPricesMap = await fetchCurrentPrices(symbols);

    // 3. 为每只股票计算成本、市值和收益
    const details = [];
    let totalCostBasis = 0;
    let totalMarketValue = 0;

    for (const holding of holdings) {
        const symbol = holding.symbol;
        const quantity = holding.quantity;
        const purchaseTimestampUnix = holding.purchase_timestamp_unix;

        // 3a. 获取当前价格
        const currentPrice = currentPricesMap.get(symbol);
        if (currentPrice === undefined) {
            console.warn(`⚠️ 无法获取股票 ${symbol} 的当前价格，跳过此持仓的收益计算`);
            details.push({
                symbol: symbol,
                quantity: quantity,
                purchaseTimestampUnix: purchaseTimestampUnix,
                costBasisPerShare: null,
                costBasisTotal: null,
                currentPrice: null,
                marketValue: null,
                profit: null,
                returnPercent: null,
                note: '当前价格获取失败'
            });
            continue;
        }

        // 3b. 获取买入价格 (成本价)
        const costBasisPerShare = await fetchPurchasePrice(symbol, purchaseTimestampUnix);
        if (costBasisPerShare === null) {
            console.warn(`⚠️ 无法获取股票 ${symbol} 的买入价格，跳过此持仓的收益计算`);
            details.push({
                symbol: symbol,
                quantity: quantity,
                purchaseTimestampUnix: purchaseTimestampUnix,
                costBasisPerShare: null,
                costBasisTotal: null,
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                marketValue: parseFloat((currentPrice * quantity).toFixed(2)),
                profit: null,
                returnPercent: null,
                note: '买入价格获取失败'
            });
            // 注意：即使买入价失败，我们仍然计算了当前市值，以便用户了解当前价值
            totalMarketValue += currentPrice * quantity;
            continue;
        }

        // 3c. 计算各项指标
        const costBasisTotal = parseFloat((costBasisPerShare * quantity).toFixed(2));
        const marketValue = parseFloat((currentPrice * quantity).toFixed(2));
        const profit = parseFloat((marketValue - costBasisTotal).toFixed(2));
        const returnPercent = parseFloat(((profit / costBasisTotal) * 100).toFixed(2));

        totalCostBasis += costBasisTotal;
        totalMarketValue += marketValue;

        details.push({
            symbol: symbol,
            quantity: quantity,
            purchaseTimestampUnix: purchaseTimestampUnix,
            // 为了方便查看，可以将 Unix 时间戳转换为日期字符串，但这不是必须的
            // purchaseDate: new Date(purchaseTimestampUnix * 1000).toISOString().split('T')[0], 
            costBasisPerShare: parseFloat(costBasisPerShare.toFixed(2)),
            costBasisTotal: costBasisTotal,
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            marketValue: marketValue,
            profit: profit,
            returnPercent: returnPercent
        });
    }

    // 4. 计算总计
    totalCostBasis = parseFloat(totalCostBasis.toFixed(2));
    totalMarketValue = parseFloat(totalMarketValue.toFixed(2));
    const totalProfit = parseFloat((totalMarketValue - totalCostBasis).toFixed(2));
    const totalReturnPercent = totalCostBasis !== 0 ? parseFloat(((totalProfit / totalCostBasis) * 100).toFixed(2)) : 0;

    const result = {
        calculationTime: new Date().toISOString(),
        totalCostBasis: totalCostBasis,
        totalMarketValue: totalMarketValue,
        totalProfit: totalProfit,
        totalReturnPercent: totalReturnPercent,
        holdings: details
    };

    console.log(`✅ 投资组合收益计算完成:`);
    console.log(`   总成本: $${totalCostBasis.toFixed(2)}`);
    console.log(`   总市值: $${totalMarketValue.toFixed(2)}`);
    console.log(`   总收益: $${totalProfit.toFixed(2)}`);
    console.log(`   总收益率: ${totalReturnPercent.toFixed(2)}%`);

    return result;
}

// --- 主逻辑 ---

/**
 * 主函数
 */
async function main() {
    console.log('=== 投资组合收益计算脚本 (含买入价) ===\n');

    try {
        // 1. 从数据库获取所有持仓 (包含买入时间)
        const holdings = await fetchAllHoldings();

        // 2. 计算总价值和收益率
        const portfolioData = await calculatePortfolioReturns(holdings);

        // 3. 输出结果
        console.log('\n=== 计算结果 ===');
        console.log(JSON.stringify(portfolioData, null, 2));

        // (可选) 将结果保存到文件
        // const fs = require('fs').promises;
        // const filename = `portfolio-returns-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        // await fs.writeFile(filename, JSON.stringify(portfolioData, null, 2));
        // console.log(`\n💾 结果已保存到文件: ${filename}`);

    } catch (error) {
        console.error('\n💥 脚本执行出错:', error.message);
        process.exit(1);
    }

    console.log('\n✅ === 脚本执行完成 ===');
}

// --- 程序入口 ---
// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('程序执行出错:', error);
        process.exit(1);
    });
}

// 导出函数以供其他模块使用
module.exports = {
    fetchAllHoldings,
    fetchPurchasePrice,
    fetchCurrentPrices,
    calculatePortfolioReturns
};