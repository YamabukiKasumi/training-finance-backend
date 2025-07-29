// services/holdingsService.js
const mysql = require('mysql2/promise');
const axios = require('axios');
const config = require('../config'); // 确保 config.js 路径正确

// API 配置 (使用多股票报价接口)
const { host: apiHost, key: apiKey } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const QUOTES_ENDPOINT = config.api.endpoints.quotes;
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
        throw error; // 重新抛出错误，让调用者处理
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
        console.log(`[DEBUG] Using API Key: ${apiKey}`); // 添加这行来调试
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

    // 使用 Promise.all 并行获取所有买入价格，提高效率
    const holdingsWithPurchasePricesPromises = holdings.map(async (holding) => {
        const costBasisPerShare = await fetchPurchasePrice(holding.symbol, holding.purchase_timestamp_unix);
        return { ...holding, costBasisPerShare };
    });

    const holdingsWithPurchasePrices = await Promise.all(holdingsWithPurchasePricesPromises);


    for (const holding of holdingsWithPurchasePrices) { // 遍历处理包含买入价的持仓
        const symbol = holding.symbol;
        const quantity = holding.quantity;
        const purchaseTimestampUnix = holding.purchase_timestamp_unix;
        const costBasisPerShare = holding.costBasisPerShare; // 从 Promise.all 结果中获取

        // 3a. 获取当前价格
        const currentPrice = currentPricesMap.get(symbol);
        if (currentPrice === undefined) {
            console.warn(`⚠️ 无法获取股票 ${symbol} 的当前价格，跳过此持仓的收益计算`);
            details.push({
                symbol: symbol,
                quantity: quantity,
                purchaseTimestampUnix: purchaseTimestampUnix,
                // 为了方便查看，可以将 Unix 时间戳转换为日期字符串
                purchaseDate: purchaseTimestampUnix ? new Date(purchaseTimestampUnix * 1000).toISOString().split('T')[0] : null,
                costBasisPerShare: costBasisPerShare ? parseFloat(costBasisPerShare.toFixed(2)) : null,
                costBasisTotal: costBasisPerShare ? parseFloat((costBasisPerShare * quantity).toFixed(2)) : null,
                currentPrice: null,
                marketValue: null,
                profit: null,
                returnPercent: null,
                note: '当前价格获取失败'
            });
            // 即使当前价格获取失败，如果买入价成功，仍然可以累加到总成本，但这里为了逻辑清晰，选择跳过整个收益计算
            // 如果你想把没当前价格的也算入总成本，需要单独处理
            continue;
        }

        // 3b. 检查买入价格是否成功获取
        if (costBasisPerShare === null) {
            console.warn(`⚠️ 无法获取股票 ${symbol} 的买入价格，跳过此持仓的收益计算`);
            details.push({
                symbol: symbol,
                quantity: quantity,
                purchaseTimestampUnix: purchaseTimestampUnix,
                purchaseDate: purchaseTimestampUnix ? new Date(purchaseTimestampUnix * 1000).toISOString().split('T')[0] : null,
                costBasisPerShare: null,
                costBasisTotal: null,
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                marketValue: parseFloat((currentPrice * quantity).toFixed(2)),
                profit: null,
                returnPercent: null,
                note: '买入价格获取失败'
            });
            // 如果买入价失败，当前市值仍然可以计入总市值
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
            purchaseDate: purchaseTimestampUnix ? new Date(purchaseTimestampUnix * 1000).toISOString().split('T')[0] : null,
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

/**
 * 聚合函数：获取并计算用户持仓的总价值和收益率
 * 这个函数将是 holdingsService 的主要入口点
 * @returns {Promise<Object>} 包含投资组合总价值和详细持仓的 JSON 对象
 */
async function getMyHoldingsPortfolioWithReturns() {
    console.log('=== 投资组合总价值和收益率计算服务 ===\n');

    try {
        // 1. 从数据库获取所有持仓 (包含买入时间)
        const holdings = await fetchAllHoldings();

        // 2. 计算总价值和收益率
        // 注意：calculatePortfolioReturns 内部会调用 fetchCurrentPrices 和 fetchPurchasePrice
        const portfolioData = await calculatePortfolioReturns(holdings);

        console.log('\n✅ === 投资组合服务执行完成 ===');
        return portfolioData;

    } catch (error) {
        console.error('\n💥 投资组合服务执行出错:', error.message);
        throw error; // 向上抛出错误，由 controller 处理
    }
}

module.exports = {
    getMyHoldingsPortfolio: getMyHoldingsPortfolioWithReturns // 将新的聚合函数导出为 getMyHoldingsPortfolio
};