// services/dailyPerformanceService.js
const mysql = require('mysql2/promise');
const config = require('../config');

const dbConfig = config.db;

/**
 * 获取每日投资组合表现
 * @param {string} [endDateStr=today] - 格式为 'YYYY-MM-DD' 的截止日期。默认为当天。
 * @returns {Promise<Array<Object>>} 返回一个包含过去30天每日表现的对象数组
 */
exports.getDailyPortfolioPerformance = async (endDateStr) => {
    // --- 1. 确定并生成日期范围 ---
    const endDate = endDateStr ? new Date(endDateStr + 'T00:00:00Z') : new Date();
    endDate.setUTCHours(0, 0, 0, 0); // 确保时间为 UTC 午夜

    const dateRange = [];
    for (let i = 0; i < 30; i++) {
        const currentDate = new Date(endDate);
        currentDate.setDate(endDate.getDate() - i);
        dateRange.push(currentDate.toISOString().split('T')[0]);
    }
    dateRange.reverse(); // 从最早的日期到最近的日期排序

    const startDateRange = dateRange[0];
    const endDateRange = dateRange[dateRange.length - 1];
    console.log(`(业绩服务) 计算日期范围: ${startDateRange} to ${endDateRange}`);

    // --- 2. 获取当前所有持仓 ---
    let connection;
    let holdings = [];
    try {
        connection = await mysql.createConnection(dbConfig);
        [holdings] = await connection.execute('SELECT symbol, quantity FROM user_stock_holdings_new');
    } finally {
        if (connection) await connection.end();
    }
    
    if (holdings.length === 0) {
        console.log('(业绩服务) 没有持仓记录，无需计算。');
        return [];
    }

    // --- 3. 一次性获取所有持仓在整个日期范围内的所有历史价格 ---
    const symbols = holdings.map(h => h.symbol);
    const placeholders = symbols.map(() => '?').join(',');
    let historicalPrices = [];
    try {
        connection = await mysql.createConnection(dbConfig);
        const sql = `
            SELECT symbol, DATE_FORMAT(data_timestamp, '%Y-%m-%d') as date, close_price
            FROM stock_history 
            WHERE symbol IN (${placeholders}) 
            AND data_timestamp BETWEEN ? AND ?
        `;
        [historicalPrices] = await connection.execute(sql, [...symbols, startDateRange, endDateRange]);
        console.log(`(业绩服务) 从数据库获取到 ${historicalPrices.length} 条相关历史价格记录`);
    } finally {
        if (connection) await connection.end();
    }

    // --- 4. 将历史价格处理成易于查询的 Map 结构 ---
    // 结构: Map<Symbol, Map<DateString, Price>>
    const pricesBySymbolByDate = new Map();
    for (const priceData of historicalPrices) {
        if (!pricesBySymbolByDate.has(priceData.symbol)) {
            pricesBySymbolByDate.set(priceData.symbol, new Map());
        }
        pricesBySymbolByDate.get(priceData.symbol).set(priceData.date, priceData.close_price);
    }

    // --- 5. 计算每一天的总资产 ---
    const dailyPortfolioValues = [];
    const lastKnownPrices = new Map(); // 用于存储每只股票最近一次的已知价格

    for (const dateStr of dateRange) {
        let dailyTotalValue = 0;

        for (const holding of holdings) {
            let priceForDay = pricesBySymbolByDate.get(holding.symbol)?.get(dateStr);
            
            if (priceForDay !== undefined) {
                // 如果今天有价格，更新该股票的最近已知价格
                lastKnownPrices.set(holding.symbol, priceForDay);
            } else {
                // 如果今天没有价格 (非交易日)，使用上一次的已知价格
                priceForDay = lastKnownPrices.get(holding.symbol) || 0;
            }
            
            dailyTotalValue += holding.quantity * priceForDay;
        }
        
        dailyPortfolioValues.push({
            date: dateStr,
            totalValue: parseFloat(dailyTotalValue.toFixed(2)),
        });
    }

    // --- 6. 计算每日收益率和变动 ---
    const finalResults = [];
    for (let i = 0; i < dailyPortfolioValues.length; i++) {
        const currentDay = dailyPortfolioValues[i];
        let dailyChange = 0;
        let dailyReturn = 0;

        if (i > 0) {
            const previousDay = dailyPortfolioValues[i - 1];
            
            // 检查当天是否有交易数据（即价格是否真的更新了）
            // 我们通过检查当天的价格是否与前一天完全相同来近似判断
            // 只有当总价值发生变化时，才计算收益
            if (currentDay.totalValue !== previousDay.totalValue && previousDay.totalValue > 0) {
                dailyChange = currentDay.totalValue - previousDay.totalValue;
                dailyReturn = (dailyChange / previousDay.totalValue) * 100;
            }
        }
        
        finalResults.push({
            date: currentDay.date,
            totalAssets: currentDay.totalValue,
            dailyProfitLoss: parseFloat(dailyChange.toFixed(2)),
            dailyReturnPercentage: parseFloat(dailyReturn.toFixed(2)),
        });
    }

    console.log(`(业绩服务) 成功计算 ${finalResults.length} 天的投资组合表现`);
    return finalResults;
};