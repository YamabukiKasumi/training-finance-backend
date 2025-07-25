// fetch-and-store-stocks.js
const axios = require('axios');
const mysql = require('mysql2/promise');
const fs = require('fs').promises; // 使用 promise 版本的 fs

// 1. 加载配置
const config = require('./config'); // 确保你的 config.js 文件路径正确

// API 配置
const { host, key } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const QUOTES_ENDPOINT = config.api.endpoints.quotes; // 确保 config.js 中有 quotes 端点
const API_URL = `${BASE_URL}${QUOTES_ENDPOINT}`;

// 数据库配置
const dbConfig = config.db; // 确保 config.js 中有 db 配置

// --- 辅助函数 ---

/**
 * 从 API 获取多只股票数据
 * @param {Array<string>} tickers 股票代码数组
 * @returns {Promise<Array>} 股票数据数组
 */
async function fetchStockDataFromAPI(tickers) {
    if (!tickers || tickers.length === 0) {
        console.log('⚠️  没有提供股票代码');
        return [];
    }

    try {
        console.log(`🔍 正在从 API 获取股票数据: ${tickers.join(', ')}`);
        const response = await axios.get(API_URL, {
            params: { ticker: tickers.join(',') },
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': host,
            },
            timeout: 15000
        });

        if (response.data && response.data.body && Array.isArray(response.data.body)) {
            console.log(`✅ 成功从 API 获取到 ${response.data.body.length} 只股票的数据`);
            return response.data.body;
        } else {
            console.error('❌ API 返回数据结构不符合预期');
            return [];
        }
    } catch (error) {
        console.error(`❌ 从 API 获取数据失败 (${tickers.join(',')}):`, error.message);
        if (error.response) {
            console.error('  状态码:', error.response.status);
            // 限制错误日志长度
            const errorDataStr = JSON.stringify(error.response.data);
            console.error('  错误详情:', errorDataStr.substring(0, 200));
        }
        return []; // 返回空数组而不是抛出错误，让程序继续处理其他部分
    }
}

/**
 * 从数据库获取当前用户持仓 (现在也获取买入日期信息，用于更新场景)
 * @returns {Promise<Map<string, {quantity: number, purchase_date: string, purchase_timestamp_unix: number}>>} 一个 Map，键为 symbol，值为包含持仓和买入信息的对象
 */
async function fetchUserHoldingsFromDB() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 数据库连接成功 (获取持仓)');

        // 注意：现在也选择新的日期字段
        const [rows] = await connection.execute('SELECT symbol, quantity, purchase_date, purchase_timestamp_unix FROM user_stock_holdings_new');
        const holdingsMap = new Map();
        for (const row of rows) {
            holdingsMap.set(row.symbol, {
                quantity: row.quantity,
                purchase_date: row.purchase_date, // 可能为 null
                purchase_timestamp_unix: row.purchase_timestamp_unix // 可能为 null
            });
        }
        console.log(`📚 从数据库获取到 ${holdingsMap.size} 条持仓记录`);
        return holdingsMap;

    } catch (error) {
        console.error('❌ 从数据库获取持仓数据失败:', error.message);
        return new Map(); // 返回空 Map，避免程序崩溃
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
 * 将合并后的股票数据存入数据库
 * @param {Array<Object>} stockDataWithHoldings 合并了持仓和买入信息的股票数据数组
 */
async function storeStockDataToDB(stockDataWithHoldings) {
    if (!stockDataWithHoldings || stockDataWithHoldings.length === 0) {
        console.log('⚠️  没有数据需要存入数据库');
        return;
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 数据库连接成功 (存储数据)');

        // --- 关键修改点：更新 SQL 语句以包含新的买入时间字段 ---
        // 使用 INSERT ... ON DUPLICATE KEY UPDATE 来处理更新或插入
        const sql = `
            INSERT INTO user_stock_holdings_new 
            (symbol, long_name, quote_type, quantity, currency, average_analyst_rating, purchase_date, purchase_timestamp_unix) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
            long_name=VALUES(long_name),
            quote_type=VALUES(quote_type),
            quantity=VALUES(quantity),
            currency=VALUES(currency),
            average_analyst_rating=VALUES(average_analyst_rating),
            purchase_date=VALUES(purchase_date), -- 更新买入日期
            purchase_timestamp_unix=VALUES(purchase_timestamp_unix), -- 更新买入时间戳
            last_updated=CURRENT_TIMESTAMP
        `;
        // --- 修改结束 ---

        // 准备数据值数组
        const values = stockDataWithHoldings.map(stock => [
            stock.symbol,
            stock.longName || stock.shortName || null,
            stock.quoteType || null,
            stock.userQuantity !== undefined ? stock.userQuantity : 0, // 使用合并后的持仓
            stock.currency || null,
            stock.averageAnalystRating || null,
            stock.purchaseDate || null, // 使用合并后的买入日期
            stock.purchaseTimestampUnix || null // 使用合并后的买入时间戳
        ]);

        console.log(`💾 开始将 ${values.length} 条记录保存到数据库...`);
        const [result] = await connection.query(sql, [values]); // 注意 [values] 的用法

        console.log(`✅ 数据库保存完成。受影响的行数: ${result.affectedRows} (其中插入: ${result.affectedRows - (result.changedRows || 0)}, 更新: ${result.changedRows || 0})`);
        
        // 保存一份 JSON 到本地文件以供检查
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `stock-data-with-holdings-${timestamp}.json`;
        await fs.writeFile(filename, JSON.stringify(stockDataWithHoldings, null, 2));
        console.log(`📄 数据已备份到本地文件: ${filename}`);

    } catch (error) {
        console.error('❌ 存储数据到数据库时出错:', error.message);
        // 打印部分数据以便调试
        console.error('  错误数据示例:', JSON.stringify(stockDataWithHoldings.slice(0, 2), null, 2));
    } finally {
        if (connection) {
            try {
                await connection.end();
                console.log('🔒 数据库连接已关闭 (存储数据)');
            } catch (closeError) {
                console.error('⚠️ 关闭数据库连接时出错:', closeError.message);
            }
        }
    }
}

/**
 * 为主动创建的持仓生成随机数量
 * @returns {number} 随机生成的持仓数量
 */
function generateRandomQuantity() {
    // 生成一个合理的随机持仓数量，例如 10 到 100 股
    return Math.floor(Math.random() * 91) + 10; // 0-90 + 10 = 10-100
}

// --- 新增/修改辅助函数 ---
/**
 * 为新生成的持仓生成一个在指定日期范围内的随机买入日期和时间戳。
 * 生成的日期将被设置为 UTC 时间的 00:00:00.000，并返回对应的 Unix 时间戳（秒）。
 *
 * @param {string} startDateStr - 开始日期字符串 'YYYY-MM-DD'
 * @param {string} endDateStr - 结束日期字符串 'YYYY-MM-DD'
 * @returns {{dateStr: string, timestamp: number}} 包含日期字符串和Unix时间戳(秒)的对象
 */
function generateRandomPurchaseDate(startDateStr = '2025-06-25', endDateStr = '2025-07-24') {
    console.log(`🎲 为持仓生成随机买入日期 (范围: ${startDateStr} to ${endDateStr})`);

    // 1. 将输入的日期字符串解析为 Date 对象 (代表 UTC 日期)
    // Date 构造函数会将 YYYY-MM-DD 解析为 UTC 日期 (时间为 00:00:00 UTC)
    let startDate = new Date(startDateStr + 'T00:00:00Z'); // 明确指定为 UTC
    let endDate = new Date(endDateStr + 'T00:00:00Z');

    // 2. 验证并修正日期范围
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('❌ 输入的日期字符串无效，使用默认范围 2020-01-01 to 2024-12-31');
        startDate = new Date('2025-06-25T00:00:00Z');
        endDate = new Date('2025-07-24T00:00:00Z');
    }

    if (endDate < startDate) {
        console.warn('⚠️ 结束日期早于开始日期，将交换两者。');
        [startDate, endDate] = [endDate, startDate]; // 交换日期
    }

    // 3. 确保起始和结束日期的时间部分是 UTC 的 00:00:00.000
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    // 4. 计算日期范围内的总毫秒数
    const diffTimeMs = endDate.getTime() - startDate.getTime();
    // 将毫秒数转换为天数
    const diffDays = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24));
    console.log(`📅 可选日期范围: ${diffDays + 1} 天`); // +1 因为包含起始和结束日期

    // 5. 生成一个随机天数偏移量 (0 到 diffDays)
    const randomDaysOffset = Math.floor(Math.random() * (diffDays + 1));
    console.log(`🎲 随机天数偏移量: ${randomDaysOffset} 天`);

    // 6. 计算随机日期 (基于 startDate)
    const randomDate = new Date(startDate.getTime() + randomDaysOffset * (1000 * 60 * 60 * 24));
    // 强制设置时间为 UTC 00:00:00.000
    randomDate.setUTCHours(0, 0, 0, 0);

    // 7. 格式化为 'YYYY-MM-DD' 字符串 (使用 UTC 方法)
    const dateStr = randomDate.toISOString().split('T')[0];
    console.log(`📅 生成的随机买入日期 (UTC): ${dateStr}`);

    // 8. 获取该日期的 Unix 时间戳 (秒)
    // Date.getTime() 返回毫秒，需要除以 1000 并取整得到秒
    const timestampSec = Math.floor(randomDate.getTime() / 1000);
    console.log(`⏰ 对应的 Unix 时间戳 (秒): ${timestampSec}`);

    // 检查时间戳是否在合理范围内 (例如 1970-01-01 到 2100-01-01)
    // 1970-01-01 00:00:00 UTC = 0
    // 2100-01-01 00:00:00 UTC = 4102444800
    if (timestampSec < 0 || timestampSec > 4102444800) {
         console.warn(`⚠️ 生成的时间戳 ${timestampSec} 可能超出预期范围 (1970-2100)`);
    }

    // 返回 Unix 时间戳 (秒)，与数据库字段类型和已有数据保持一致
    return { dateStr, timestamp: timestampSec };
}
// --- 函数结束 ---

// --- 主逻辑 ---

/**
 * 主函数
 */
async function main() {
    console.log('=== 股票数据获取与存储脚本 (含买入时间) ===');

    // 1. 定义要获取的股票列表
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA'];
    console.log(`📋 目标股票列表: ${tickers.join(', ')}`);

    // 2. 从 API 获取股票数据
    const apiStockData = await fetchStockDataFromAPI(tickers);
    if (apiStockData.length === 0) {
        console.log('🔚 由于没有从 API 获取到数据，脚本结束。');
        return;
    }

    // 3. 从数据库获取现有持仓 (包含买入信息)
    const dbHoldingsMap = await fetchUserHoldingsFromDB();

    // 4. 合并数据：将 API 数据与数据库持仓结合
    console.log('\n🔄 正在合并 API 数据与数据库持仓...');
    const mergedData = apiStockData.map(stock => {
        const symbol = stock.symbol;
        // 从数据库获取持仓和买入信息
        const holdingInfoFromDB = dbHoldingsMap.get(symbol);
        
        let finalQuantity, purchaseDateObj;

        if (holdingInfoFromDB !== undefined) {
            // 如果数据库中有记录，则使用数据库中的持仓数量和买入时间
            finalQuantity = holdingInfoFromDB.quantity;
            // 如果数据库中已有买入时间，则使用它
            if (holdingInfoFromDB.purchase_timestamp_unix && holdingInfoFromDB.purchase_date) {
                purchaseDateObj = {
                    dateStr: holdingInfoFromDB.purchase_date,
                    timestamp: holdingInfoFromDB.purchase_timestamp_unix
                };
            } else {
                // 如果数据库记录中没有买入时间（可能旧数据），则为它生成一个
                console.log(`⚠️  股票 ${symbol} 在数据库中没有买入时间，将生成一个随机时间。`);
                purchaseDateObj = generateRandomPurchaseDate();
            }
        } else {
            // 如果数据库中没有记录，则生成新的随机持仓和买入时间
            finalQuantity = generateRandomQuantity();
            purchaseDateObj = generateRandomPurchaseDate(); // 使用默认日期范围 '2020-01-01' to '2024-12-31'
        }
        
        return {
            ...stock,
            userQuantity: finalQuantity, // 添加用户持仓字段
            purchaseDate: purchaseDateObj.dateStr, // 添加买入日期字段
            purchaseTimestampUnix: purchaseDateObj.timestamp // 添加买入时间戳字段
        };
    });

    // 5. (可选) 打印合并后的部分数据以供检查
    console.log('\n📄 合并后数据示例 (前3条):');
    mergedData.slice(0, 3).forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} - ${stock.longName}`);
        console.log(`     当前价: $${stock.regularMarketPrice}`);
        console.log(`     用户持仓: ${stock.userQuantity} 股`);
        console.log(`     买入时间: ${stock.purchaseDate} (${stock.purchaseTimestampUnix})`);
        console.log(`     市值: $${(stock.regularMarketPrice * stock.userQuantity).toFixed(2)}`);
        console.log(`     评级: ${stock.averageAnalystRating || 'N/A'}`);
    });

    // 6. 将合并后的数据存入数据库
    await storeStockDataToDB(mergedData);

    console.log('\n✅ === 脚本执行完成 ===');
}

// --- 程序入口 ---
if (require.main === module) {
    main().catch(error => {
        console.error('💥 程序执行出错:', error);
        process.exit(1);
    });
}

// 导出函数以供其他模块使用
module.exports = {
    fetchStockDataFromAPI,
    fetchUserHoldingsFromDB,
    storeStockDataToDB,
    generateRandomQuantity,
    generateRandomPurchaseDate, // 导出新函数
    main
};