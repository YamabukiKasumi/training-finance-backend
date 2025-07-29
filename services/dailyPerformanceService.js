// services/dailyPerformanceService.js
const mysql = require('mysql2/promise');
const axios = require('axios'); // 确保引入 axios
const config = require('../config');

const dbConfig = config.db;
const { baseUrl, historicalPriceFullEndpoint, apiKey } = config.financialModelingPrep;

// --- 新增辅助函数：获取基准(SPY)表现 ---
/**
 * 从 FMP API 获取 SPY 在指定日期范围内的每日收益率
 * @param {string} startDateStr 'YYYY-MM-DD'
 * @param {string} endDateStr 'YYYY-MM-DD'
 * @returns {Promise<Map<string, number>>} 一个 Map，键为日期字符串，值为 changePercent
 */
async function fetchBenchmarkPerformance(startDateStr, endDateStr) {
    const BENCHMARK_SYMBOL = 'SPY';
    const url = `${baseUrl}${historicalPriceFullEndpoint}`;
    console.log(`(基准服务) 正在从 FMP API 获取 ${BENCHMARK_SYMBOL} 的历史表现...`);
    
    try {
        const response = await axios.get(url, {
            params: {
                symbol: BENCHMARK_SYMBOL,
                from: startDateStr,
                to: endDateStr,
                apikey: apiKey
            },
            timeout: 15000
        });

        const benchmarkMap = new Map();
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(day => {
                if (day.date && day.changePercent !== undefined) {
                    benchmarkMap.set(day.date, day.changePercent);
                }
            });
        }
        console.log(`(基准服务) 成功获取并处理了 ${benchmarkMap.size} 条 ${BENCHMARK_SYMBOL} 的记录`);
        return benchmarkMap;
    } catch (error) {
        console.error(`❌ (基准服务) 获取 ${BENCHMARK_SYMBOL} 表现失败:`, error.message);
        // 即使基准获取失败，也返回一个空 Map，不中断主流程
        return new Map();
    }
}


/**
 * 获取每日投资组合表现，并与基准(SPY)对比
 * @param {string} [endDateStr=today] - 格式为 'YYYY-MM-DD' 的截止日期。
 * @returns {Promise<Array<Object>>}
 */
exports.getDailyPortfolioPerformance = async (endDateStr) => {
    // 1. 确定日期范围 (两个并行任务都需要)
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

    // --- 2. *** 核心修改：使用 Promise.all 并行执行任务 *** ---
    const [portfolioPerformance, benchmarkMap] = await Promise.all([
        
        // --- 任务 A: 计算个人投资组合表现 (这是你提供的、已优化的完整逻辑) ---
        (async () => {
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

            // 核心优化：获取初始价格状态
            const initialPricesMap = new Map();
            try {
                connection = await mysql.createConnection(dbConfig);
                const initialPriceSql = `WITH RankedPrices AS (SELECT symbol, close_price, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY data_timestamp DESC) as rn FROM stock_history WHERE symbol IN (${placeholders}) AND data_timestamp <= ?) SELECT symbol, close_price FROM RankedPrices WHERE rn = 1;`;
                const [initialPriceRows] = await connection.execute(initialPriceSql, [...symbols, startDateRange]);
                initialPriceRows.forEach(row => initialPricesMap.set(row.symbol, row.close_price));
                console.log(`(业绩服务) 成功获取 ${initialPricesMap.size} 只股票的初始价格状态`);
            } finally {
                if (connection) await connection.end();
            }
            
            // 获取在30天周期内的所有历史价格
            let historicalPrices = [];
            try {
                connection = await mysql.createConnection(dbConfig);
                const sql = `SELECT symbol, DATE_FORMAT(data_timestamp, '%Y-%m-%d') as date, close_price FROM stock_history WHERE symbol IN (${placeholders}) AND data_timestamp BETWEEN ? AND ?`;
                [historicalPrices] = await connection.execute(sql, [...symbols, startDateRange, endDateRange]);
                console.log(`(业绩服务) 从数据库获取到 ${historicalPrices.length} 条区间内历史价格记录`);
            } finally {
                if (connection) await connection.end();
            }

            const pricesBySymbolByDate = new Map();
            for (const priceData of historicalPrices) {
                if (!pricesBySymbolByDate.has(priceData.symbol)) pricesBySymbolByDate.set(priceData.symbol, new Map());
                pricesBySymbolByDate.get(priceData.symbol).set(priceData.date, priceData.close_price);
            }

            // 计算每一天的总资产
            const dailyPortfolioValues = [];
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
                dailyPortfolioValues.push({ date: dateStr, totalValue: parseFloat(dailyTotalValue.toFixed(2)) });
            }

            // 计算每日收益率和变动
            const finalResults = [];
            for (let i = 0; i < dailyPortfolioValues.length; i++) {
                const currentDay = dailyPortfolioValues[i];
                let dailyChange = 0, dailyReturn = 0;
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
            console.log(`(业绩服务) 个人投资组合表现计算完成`);
            return finalResults;
        })(),
        
        // --- 任务 B: 获取 SPY 基准表现 ---
        fetchBenchmarkPerformance(startDateRange, endDateRange)
    ]);

    // --- 3. 合并两个任务的结果 ---
    const finalResultsWithBenchmark = portfolioPerformance.map(dayData => {
        // 从 benchmarkMap 中查找当天的 SPY 收益率
        const benchmarkReturn = benchmarkMap.get(dayData.date) || 0;

        return {
            ...dayData,
            benchmarkReturnPercentage: parseFloat(benchmarkReturn.toFixed(4))
        };
    });
    
    console.log(`(业绩服务) 成功合并个人表现与基准表现数据`);
    return finalResultsWithBenchmark;
};