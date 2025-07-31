// services/portfolioAnalysisService.js
const mysql = require('mysql2/promise');
const axios = require('axios');
const config = require('../config');

// --- 配置 (从 config.js 中获取) ---
const dbConfig = config.db;
const { host: apiHost, key: apiKey } = config.rapidapi.yahooFinance;
const API_URL = `${config.api.baseUrl}${config.api.endpoints.quotes}`;

// --- 辅助函数 ---

/**
 * 从数据库获取所有持仓的关键信息 (symbol, quantity, quote_type)
 * @returns {Promise<Array<{symbol: string, quantity: number, quote_type: string}>>}
 */
async function fetchAllHoldingsWithTypes() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 (Analysis) Connect to database');

        const [rows] = await connection.execute(
            'SELECT symbol, quantity, quote_type FROM user_stock_holdings_new'
        );
        console.log(`📚 (Analysis) Fetch ${rows.length} records from database`);
        return rows;
    } catch (error) {
        console.error('❌ (Analysis) Fail to fetch holdings:', error.message);
        throw error; // 抛出错误，让主函数处理
    } finally {
        if (connection) await connection.end();
    }
}

/**
 * 从 API 获取指定股票的当前价格
 * (这个函数与 holdingsService 中的功能相同)
 * @param {Array<string>} symbols 股票代码数组
 * @returns {Promise<Map<string, number>>} 一个 Map，键为 symbol，值为 regularMarketPrice
 */
async function fetchCurrentPrices(symbols) {
    if (!symbols || symbols.length === 0) return new Map();

    try {
        console.log(`🔍 (分析服务) 正在获取 ${symbols.length} 只股票的当前价格...`);
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
                }
            });
        }
        console.log(`✅ (分析服务) 成功获取到 ${pricesMap.size} 只股票的价格`);
        return pricesMap;
    } catch (error) {
        console.error('❌ (分析服务) 获取当前价格失败:', error.message);
        throw error;
    }
}

// --- 主服务函数 ---

/**
 * 计算投资组合中各类资产的总价值和占比
 * @returns {Promise<Array<{type: string, totalValue: number, percentage: number}>>}
 */
exports.calculateAssetAllocation = async () => {
    // 1. 获取所有持仓
    const holdings = await fetchAllHoldingsWithTypes();
    if (holdings.length === 0) {
        return []; // 如果没有持仓，直接返回空数组
    }

    // 2. 获取所有持仓的当前价格
    const symbols = holdings.map(h => h.symbol);
    const pricesMap = await fetchCurrentPrices(symbols);

    // 3. 计算并按类型聚合市值
    const allocation = {}; // 使用对象来聚合, e.g., { "EQUITY": 15000, "ETF": 5000 }
    let grandTotalValue = 0;

    for (const holding of holdings) {
        const currentPrice = pricesMap.get(holding.symbol);
        
        // 只计算能获取到价格的持仓
        if (currentPrice) {
            const marketValue = holding.quantity * currentPrice;
            const assetType = holding.quote_type || 'UNKNOWN'; // 处理 null 或空字符串的情况

            // 累加到对应类型
            if (!allocation[assetType]) {
                allocation[assetType] = 0;
            }
            allocation[assetType] += marketValue;

            // 累加到总市值
            grandTotalValue += marketValue;
        }
    }

    // 4. 格式化为前端需要的数组格式，并计算百分比
    if (grandTotalValue === 0) return []; // 如果总价值为0，也返回空数组

    const result = Object.entries(allocation).map(([type, totalValue]) => ({
        type: type,
        totalValue: parseFloat(totalValue.toFixed(2)),
        percentage: parseFloat(((totalValue / grandTotalValue) * 100).toFixed(2))
    }));

    console.log('✅ (Analysis) Assest analysis:', result);
    return result;
};