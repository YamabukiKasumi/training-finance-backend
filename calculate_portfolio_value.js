// calculate-portfolio-value.js
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
 * 从数据库获取所有用户持仓
 * @returns {Promise<Array<{symbol: string, quantity: number}>>} 持仓数组
 */
async function fetchAllHoldings() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 已连接到数据库');

        const [rows] = await connection.execute('SELECT symbol, quantity FROM user_stock_holdings_new');
        console.log(`📚 从数据库获取到 ${rows.length} 条持仓记录`);
        return rows;

    } catch (error) {
        console.error('❌ 从数据库获取持仓失败:', error.message);
        throw error; // 重新抛出错误，让主函数处理
    } finally {
        if (connection) {
            try {
                await connection.end();
                console.log('🔒 数据库连接已关闭');
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
 * 计算投资组合总价值
 * @param {Array<{symbol: string, quantity: number}>} holdings 持仓数据
 * @param {Map<string, number>} pricesMap 价格映射
 * @returns {Object} 包含详细信息和总计的 JSON 对象
 */
function calculatePortfolioValue(holdings, pricesMap) {
    console.log('\n🧮 正在计算投资组合价值...');
    const details = [];
    let totalValue = 0;
    let totalCost = 0; // 如果数据库里有买入价字段，可以计算总成本和总盈亏

    for (const holding of holdings) {
        const symbol = holding.symbol;
        const quantity = holding.quantity;
        const currentPrice = pricesMap.get(symbol);

        if (currentPrice === undefined) {
            console.warn(`⚠️ 无法获取股票 ${symbol} 的价格，跳过计算`);
            details.push({
                symbol: symbol,
                quantity: quantity,
                currentPrice: null,
                marketValue: null,
                note: '价格获取失败'
            });
            continue;
        }

        const marketValue = parseFloat((currentPrice * quantity).toFixed(2));
        totalValue += marketValue;

        details.push({
            symbol: symbol,
            quantity: quantity,
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            marketValue: marketValue
            // 如果有买入价，可以在这里添加 costBasis, profit/loss 等
        });
    }

    totalValue = parseFloat(totalValue.toFixed(2));

    const result = {
        calculationTime: new Date().toISOString(),
        totalMarketValue: totalValue,
        holdings: details
    };

    console.log(`✅ 投资组合总市值计算完成: $${totalValue.toFixed(2)}`);
    return result;
}

// --- 主逻辑 ---

/**
 * 主函数
 */
async function main() {
    console.log('=== 投资组合总价值计算脚本 ===\n');

    try {
        // 1. 从数据库获取所有持仓
        const holdings = await fetchAllHoldings();

        if (holdings.length === 0) {
            console.log('ℹ️  数据库中没有持仓记录');
            console.log(JSON.stringify({ message: '没有持仓记录' }, null, 2));
            return;
        }

        // 2. 提取所有股票代码
        const symbols = holdings.map(h => h.symbol);
        console.log(`📋 需要查询价格的股票: ${symbols.join(', ')}`);

        // 3. 从 API 获取当前价格
        const pricesMap = await fetchCurrentPrices(symbols);

        // 4. 计算总价值
        const portfolioData = calculatePortfolioValue(holdings, pricesMap);

        // 5. 输出结果
        console.log('\n=== 计算结果 ===');
        console.log(JSON.stringify(portfolioData, null, 2));

        // (可选) 将结果保存到文件
        // const fs = require('fs').promises;
        // const filename = `portfolio-value-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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
    fetchCurrentPrices,
    calculatePortfolioValue,
    main
};