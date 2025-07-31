// services/ratingService.js
const axios = require('axios');
const mysql = require('mysql2/promise');
const config = require('../config');

// --- 配置 ---
const dbConfig = config.db;
const { baseUrl, ratingSnapshotEndpoint, apiKey } = config.financialModelingPrep;
const { allowedSymbols, requestIntervalMs } = config.ratingConfig;
const API_URL = `${baseUrl}${ratingSnapshotEndpoint}`;

// --- 辅助函数 ---

/**
 * 延迟函数
 * @param {number} ms - 毫秒
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取用户的所有持仓股票代码
 * @returns {Promise<string[]>}
 */
async function fetchUserHoldingsSymbols() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT symbol FROM user_stock_holdings_new');
        return rows.map(row => row.symbol);
    } catch (error) {
        console.error('❌ (Rating) Fail to fetch the holdings:', error.message);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

/**
 * 从 API 获取单只股票的评级数据
 * @param {string} symbol - 股票代码
 * @returns {Promise<Object|null>}
 */
async function fetchRatingForSymbol(symbol) {
    try {
        console.log(`🔍 (Rating) Fetching ${symbol}'s ratings'...`);
        const response = await axios.get(API_URL, {
            params: { symbol, apikey: apiKey },
            timeout: 10000
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            return response.data[0];
        }
        console.warn(`⚠️ (Rating) Fail to return valid ${symbol}'s records'`);
        return null;
    } catch (error) {
        console.error(`❌ (Rating) Fail to fetch ${symbol} ratings:`, error.message);
        return null; // 失败时返回 null，不中断整个流程
    }
}

// --- 主服务函数 ---

/**
 * 计算投资组合的综合平均评分
 * @returns {Promise<Object>}
 */
exports.calculateAveragePortfolioRating = async () => {
    // 1. 获取用户持仓
    const userHoldings = await fetchUserHoldingsSymbols();
    
    // 2. 筛选出在白名单中存在的持仓
    const eligibleSymbols = userHoldings.filter(symbol => allowedSymbols.has(symbol));

    if (eligibleSymbols.length === 0) {
        console.log('ℹ️ (Rating) No valid holdings');
        return { message: 'No holding stock.' };
    }
    console.log(`(Rating) valid holdings: ${eligibleSymbols.join(', ')}`);

    // 3. 初始化用于累加分数的对象和成功计数器
    const totalScores = {
        discountedCashFlowScore: 0,
        returnOnAssetsScore: 0,
        debtToEquityScore: 0,
        priceToEarningsScore: 0,
        priceToBookScore: 0,
    };
    let successfulRatingsCount = 0;

    // 4. 循环获取每只股票的评级，并累加分数
    for (let i = 0; i < eligibleSymbols.length; i++) {
        const symbol = eligibleSymbols[i];
        const ratingData = await fetchRatingForSymbol(symbol);

        if (ratingData) {
            successfulRatingsCount++;
            totalScores.discountedCashFlowScore += ratingData.discountedCashFlowScore || 0;
            totalScores.returnOnAssetsScore += ratingData.returnOnAssetsScore || 0;
            totalScores.debtToEquityScore += ratingData.debtToEquityScore || 0;
            totalScores.priceToEarningsScore += ratingData.priceToEarningsScore || 0;
            totalScores.priceToBookScore += ratingData.priceToBookScore || 0;
        }

        // 在每次请求后添加延迟（除了最后一次）
        if (i < eligibleSymbols.length - 1) {
            await delay(requestIntervalMs);
        }
    }

    // 5. 计算平均分并返回结果
    if (successfulRatingsCount === 0) {
        console.log('ℹ️ (Rating) Cannot fetch any ratings for the holdings.');
        return { message: 'Fail to fetch ratings.' };
    }

    const averageScores = {
        averageDiscountedCashFlowScore: parseFloat((totalScores.discountedCashFlowScore / successfulRatingsCount).toFixed(2)),
        averageReturnOnAssetsScore: parseFloat((totalScores.returnOnAssetsScore / successfulRatingsCount).toFixed(2)),
        averageDebtToEquityScore: parseFloat((totalScores.debtToEquityScore / successfulRatingsCount).toFixed(2)),
        averagePriceToEarningsScore: parseFloat((totalScores.priceToEarningsScore / successfulRatingsCount).toFixed(2)),
        averagePriceToBookScore: parseFloat((totalScores.priceToBookScore / successfulRatingsCount).toFixed(2))
    };
    
    console.log('✅ (Rating) Done.', averageScores);
    return averageScores;
};