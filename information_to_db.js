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
 * 从数据库获取当前用户持仓
 * @returns {Promise<Map<string, number>>} 一个 Map，键为 symbol，值为 quantity
 */
async function fetchUserHoldingsFromDB() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 数据库连接成功 (获取持仓)');

        const [rows] = await connection.execute('SELECT symbol, quantity FROM user_stock_holdings');
        const holdingsMap = new Map();
        for (const row of rows) {
            holdingsMap.set(row.symbol, row.quantity);
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
 * @param {Array<Object>} stockDataWithHoldings 合并了持仓信息的股票数据数组
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

        // 使用 INSERT ... ON DUPLICATE KEY UPDATE 来处理更新或插入
        const sql = `
            INSERT INTO user_stock_holdings 
            (symbol, long_name, quote_type, quantity, currency, average_analyst_rating) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
            long_name=VALUES(long_name),
            quote_type=VALUES(quote_type),
            quantity=VALUES(quantity),
            currency=VALUES(currency),
            average_analyst_rating=VALUES(average_analyst_rating),
            last_updated=CURRENT_TIMESTAMP
        `;

        // 准备数据值数组
        const values = stockDataWithHoldings.map(stock => [
            stock.symbol,
            stock.longName || stock.shortName || null,
            stock.quoteType || null,
            stock.userQuantity !== undefined ? stock.userQuantity : 0, // 使用合并后的持仓
            stock.currency || null,
            stock.averageAnalystRating || null
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
    // 生成一个合理的随机持仓数量，例如 1 到 100 股
    return Math.floor(Math.random() * 90) + 10;
}

// --- 主逻辑 ---

/**
 * 主函数
 */
async function main() {
    console.log('=== 股票数据获取与存储脚本 ===');

    // 1. 定义要获取的股票列表
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA'];
    console.log(`📋 目标股票列表: ${tickers.join(', ')}`);

    // 2. 从 API 获取股票数据
    const apiStockData = await fetchStockDataFromAPI(tickers);
    if (apiStockData.length === 0) {
        console.log('🔚 由于没有从 API 获取到数据，脚本结束。');
        return;
    }

    // 3. 从数据库获取现有持仓
    const dbHoldingsMap = await fetchUserHoldingsFromDB();

    // 4. 合并数据：将 API 数据与数据库持仓结合
    console.log('\n🔄 正在合并 API 数据与数据库持仓...');
    const mergedData = apiStockData.map(stock => {
        const symbol = stock.symbol;
        // 从数据库获取持仓，如果没有则生成一个随机数
        const quantityFromDB = dbHoldingsMap.get(symbol);
        const finalQuantity = quantityFromDB !== undefined ? quantityFromDB : generateRandomQuantity();
        
        return {
            ...stock,
            userQuantity: finalQuantity // 添加用户持仓字段
        };
    });

    // 5. (可选) 打印合并后的部分数据以供检查
    console.log('\n📄 合并后数据示例 (前3条):');
    mergedData.slice(0, 3).forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} - ${stock.longName}`);
        console.log(`     当前价: $${stock.regularMarketPrice}`);
        console.log(`     用户持仓: ${stock.userQuantity} 股`);
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
    generateRandomQuantity
};