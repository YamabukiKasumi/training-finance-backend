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
    console.log(`(benckmark) Trying to fetch the history of ${BENCHMARK_SYMBOL} From FMP API...`);
    
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
        console.log(`(benchmark) Successfully fetch and process ${benchmarkMap.size} ${BENCHMARK_SYMBOL} records.`);
        return benchmarkMap;
    } catch (error) {
        console.error(`❌ (benchmark) Fail to fetch ${BENCHMARK_SYMBOL} history:`, error.message);
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
    console.log(`(daily performance) Calculate the range of date: ${startDateRange} to ${endDateRange}`);

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
                console.log('(daily performance) No holding records and no need to calculate.');
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
                console.log(`(daily performance) Successfully fetch ${initialPricesMap.size} stocks' initial prices.`);
            } finally {
                if (connection) await connection.end();
            }
            
            // 获取在30天周期内的所有历史价格
            let historicalPrices = [];
            try {
                connection = await mysql.createConnection(dbConfig);
                const sql = `SELECT symbol, DATE_FORMAT(data_timestamp, '%Y-%m-%d') as date, close_price FROM stock_history WHERE symbol IN (${placeholders}) AND data_timestamp BETWEEN ? AND ?`;
                [historicalPrices] = await connection.execute(sql, [...symbols, startDateRange, endDateRange]);
                console.log(`(daily performance) Fetch ${historicalPrices.length} history price records from the database in the range of designated dates.`);
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
            console.log(`(daily performance) Successfully calculate the personal portfolio performance.`);
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
    
    console.log(`(daily performance) Successfully merge the personal portfolio and the benchmark performance.`);
    return finalResultsWithBenchmark;
};