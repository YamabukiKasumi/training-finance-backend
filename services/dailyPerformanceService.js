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
    endDate.setUTCHours(0, 0, 0, 0);

    const dateRange = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

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
    const symbols = holdings.map(h => h.symbol);
    const placeholders = symbols.map(() => '?').join(',');

    // --- 3. *** 核心优化：获取初始价格状态 *** ---
    // 为分析周期的第一天，找到每个持仓在当天或之前最近的收盘价。
    const initialPricesMap = new Map();
    try {
        connection = await mysql.createConnection(dbConfig);
        // 使用窗口函数 (ROW_NUMBER) 来为每个 symbol 按日期降序排名，然后取第一个
        const initialPriceSql = `
            WITH RankedPrices AS (
                SELECT 
                    symbol, 
                    close_price, 
                    ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY data_timestamp DESC) as rn
                FROM stock_history
                WHERE symbol IN (${placeholders}) AND data_timestamp <= ?
            )
            SELECT symbol, close_price FROM RankedPrices WHERE rn = 1;
        `;
        const [initialPriceRows] = await connection.execute(initialPriceSql, [...symbols, startDateRange]);
        
        initialPriceRows.forEach(row => {
            initialPricesMap.set(row.symbol, row.close_price);
        });
        console.log(`(业绩服务) 成功获取 ${initialPricesMap.size} 只股票的初始价格状态`);
    } finally {
        if (connection) await connection.end();
    }
    
    // --- 4. 获取在30天周期内的所有历史价格 ---
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
        console.log(`(业绩服务) 从数据库获取到 ${historicalPrices.length} 条区间内历史价格记录`);
    } finally {
        if (connection) await connection.end();
    }

    const pricesBySymbolByDate = new Map();
    for (const priceData of historicalPrices) {
        if (!pricesBySymbolByDate.has(priceData.symbol)) {
            pricesBySymbolByDate.set(priceData.symbol, new Map());
        }
        pricesBySymbolByDate.get(priceData.symbol).set(priceData.date, priceData.close_price);
    }

    // --- 5. 计算每一天的总资产 (使用优化后的初始状态) ---
    const dailyPortfolioValues = [];
    // *** 使用初始价格状态来初始化 lastKnownPrices ***
    const lastKnownPrices = new Map(initialPricesMap);

    for (const dateStr of dateRange) {
        let dailyTotalValue = 0;
        for (const holding of holdings) {
            let priceForDay = pricesBySymbolByDate.get(holding.symbol)?.get(dateStr);
            
            if (priceForDay !== undefined) {
                lastKnownPrices.set(holding.symbol, priceForDay);
            } else {
                priceForDay = lastKnownPrices.get(holding.symbol) || 0;
            }
            dailyTotalValue += holding.quantity * priceForDay;
        }
        dailyPortfolioValues.push({
            date: dateStr,
            totalValue: parseFloat(dailyTotalValue.toFixed(2)),
        });
    }

    // --- 6. 计算每日收益率和变动 (此部分逻辑无需修改) ---
    const finalResults = [];
    for (let i = 0; i < dailyPortfolioValues.length; i++) {
        const currentDay = dailyPortfolioValues[i];
        let dailyChange = 0;
        let dailyReturn = 0;

        if (i > 0) {
            const previousDay = dailyPortfolioValues[i - 1];
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