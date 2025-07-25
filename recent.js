// recent.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
// 1. 引入 mysql2/promise 模块
const mysql = require('mysql2/promise');
const config = require('./config');


const { host, key } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const ENDPOINT = config.api.endpoints.history;

const API_URL = `${BASE_URL}${ENDPOINT}`
/**
 * 获取股票历史数据
 * @param {string} symbol - 股票代码
 * @param {string} interval - 数据间隔 (例如: 1d, 1m)
 * @param {number} limit - 请求的数据点限制
 * @returns {Promise<Object>} API 响应数据
 */
async function getStockHistory(symbol, interval = '1d', limit = 640) {
    try {
        console.log(`正在获取 ${symbol} 的历史数据 (间隔: ${interval}, 限制: ${limit})...`);

        const response = await axios.get(API_URL, {
            params: {
                symbol: symbol,
                interval: interval,
                limit: limit
            },
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': host,
            },
            timeout: 30000 // 30秒超时
        });

        console.log(`✅ 成功获取 ${symbol} 的历史数据`);
        return response.data;
    } catch (error) {
        console.error(`❌ 获取 ${symbol} 历史数据失败:`, error.message);
        if (error.response) {
            console.error('  HTTP状态码:', error.response.status);
            const errorStr = JSON.stringify(error.response.data);
            const errorPreview = errorStr.length > 500 ? errorStr.substring(0, 500) + '...' : errorStr;
            console.error('  错误数据预览:', errorPreview);
        }
        throw error;
    }
}

/**
 * 从历史数据中提取数据点数组（兼容不同格式）
 * @param {Object} historyData - API 返回的完整历史数据
 * @returns {Array|null} 一个数据点对象的数组；如果格式不支持则返回 null
 */
function extractDataPoints(historyData) {
    if (!historyData || typeof historyData !== 'object') {
        return null;
    }

    const keys = Object.keys(historyData);

    // --- 格式 D (当前遇到的): 数据点在 'body' 数组中 ---
    // 特征: 有 'body' 键，且 'body' 是一个数组
    if (keys.includes('body') && Array.isArray(historyData.body)) {
        console.log('🔍 检测到数据格式 D (数据点在 body 数组内)');
        // 简单验证第一个元素是否存在且是对象
        if (historyData.body.length > 0 && typeof historyData.body[0] === 'object' && historyData.body[0] !== null) {
             console.log(`  验证通过，body 是包含 ${historyData.body.length} 个数据点的数组`);
             // 假设数组元素本身就是数据点对象
             return historyData.body;
        } else if (historyData.body.length === 0) {
             console.log('  body 数组为空');
             return []; // 返回空数组
        } else {
             console.log('  body 数组元素不是对象');
             return null;
        }
    }

    // --- 格式 C (之前的猜测): 数据点在 'body' 对象中，键是时间戳 ---
    // 特征: 有 'body' 和 'meta' 键，且 'body' 是一个对象
    if (keys.includes('body') && typeof historyData.body === 'object' && historyData.body !== null && keys.includes('meta')) {
        console.log('🔍 检测到数据格式 C (数据点在 body 对象内，body 是时间戳对象)');
        // 进一步验证 body 是否看起来像时间戳数据 (检查第一个键)
        const bodyKeys = Object.keys(historyData.body);
        if (bodyKeys.length > 0) {
             const firstBodyKey = bodyKeys[0];
             // 简单检查第一个键是否像时间戳 (数字字符串，长度接近10位)
             if (/^\d{9,11}$/.test(firstBodyKey)) {
                 console.log(`  验证通过，body 包含时间戳键 (示例: ${firstBodyKey})`);
                 // 将 { timestamp: dataPoint } 对象转换为 [dataPoint] 数组
                 return Object.values(historyData.body);
             } else {
                 console.log(`  body 的键 (${firstBodyKey}) 不像时间戳`);
                 // 如果不像时间戳，但也可能是嵌套的，暂时按对象处理
                 return Object.values(historyData.body);
             }
        } else {
            console.log('  body 对象为空');
            return []; // 返回空数组
        }
    }

    // --- 格式 A: 数据点直接在根对象下 (如 Pasted_Text_1753340724097.txt) ---
    // 特征: 有 'meta' 键（或 'items' 键），还有其他看起来像时间戳的键
    if (keys.includes('meta') || keys.includes('items')) {
        const dataContainer = historyData.items || historyData; // 优先检查 items
        console.log('🔍 检测到数据格式 A (根对象或 items 对象包含数据点)');
        const dataPoints = [];
        for (const key in dataContainer) {
            if (key !== 'meta' && key !== 'items' && key !== 'error' && dataContainer.hasOwnProperty(key)) {
                const timestamp = parseInt(key, 10);
                if (!isNaN(timestamp) && timestamp > 1000000000) { // 简单的时间戳范围检查
                    // 将 { timestamp: dataPoint } 转换为 [dataPoint] 数组元素的形式
                    dataPoints.push(dataContainer[key]);
                }
            }
        }
        return dataPoints;
    }

    // --- 如果都不匹配 ---
    console.log('⚠️  无法识别历史数据格式');
    return null;
}

/**
 * 从历史数据中筛选出最近 N 天的记录
 * @param {Object} historyData - API 返回的完整历史数据
 * @param {number} days - 要筛选的天数
 * @returns {Array} 筛选后的数据项数组
 */
function filterRecentDays(historyData, days = 7) {
    console.log('\n--- 数据结构调试信息 ---');
    console.log('historyData 类型:', typeof historyData);
    console.log('historyData 是否为 null/undefined:', historyData == null);

    if (historyData && typeof historyData === 'object') {
        console.log('historyData 根键:', Object.keys(historyData));
    }
    console.log('--- 数据结构调试信息结束 ---\n');

    // --- 使用通用提取函数 ---
    const itemsArray = extractDataPoints(historyData);

    console.log('\n--- extractDataPoints 结果 ---');
    console.log('提取到的 itemsArray 类型:', typeof itemsArray);
    console.log('提取到的 itemsArray 是否为数组:', Array.isArray(itemsArray));
    console.log('提取到的 itemsArray 是否为 null/undefined:', itemsArray == null);
    if (Array.isArray(itemsArray)) {
        console.log('itemsArray 长度:', itemsArray.length);
        if (itemsArray.length > 0) {
            console.log('第一个数据点结构:', itemsArray[0] ? Object.keys(itemsArray[0]) : 'undefined');
            // 检查第一个数据点是否有时间戳字段
            const firstItem = itemsArray[0];
            const tsFields = ['timestamp', 'timestamp_unix', 'date_utc'];
            const foundTsField = tsFields.find(field => firstItem.hasOwnProperty(field));
            if (foundTsField) {
                console.log(`  发现时间戳字段: ${foundTsField} = ${firstItem[foundTsField]}`);
            } else {
                console.log('  未找到标准时间戳字段 (timestamp, timestamp_unix, date_utc)');
            }
        }
    }
    console.log('--- extractDataPoints 结果结束 ---\n');

    if (!Array.isArray(itemsArray)) {
        console.warn('⚠️  无法解析历史数据格式或数据为空');
        return [];
    }

    if (itemsArray.length === 0) {
        console.warn('⚠️  历史数据中没有数据点');
        return [];
    }

    console.log(`📊 原始数据共包含 ${itemsArray.length} 条记录`);

    // --- 确定时间戳字段并排序 ---
    // 假设数据点对象中有 'timestamp' 或 'timestamp_unix' 或 'date_utc' 字段
    // 我们需要找到实际包含时间戳的那个字段
    let timestampField = null;
    const tsFieldsToCheck = ['timestamp', 'timestamp_unix', 'date_utc'];
    if (itemsArray.length > 0 && typeof itemsArray[0] === 'object' && itemsArray[0] !== null) {
        for (const field of tsFieldsToCheck) {
            if (itemsArray[0].hasOwnProperty(field)) {
                const tsValue = itemsArray[0][field];
                // 简单验证是否像时间戳 (数字且在合理范围)
                if (typeof tsValue === 'number' && tsValue > 1000000000) {
                    timestampField = field;
                    break;
                }
            }
        }
    }

    if (!timestampField) {
        console.warn('⚠️  无法确定数据点中的时间戳字段');
        // 尝试使用第一个数字类型的字段
        if (itemsArray.length > 0) {
             const firstItem = itemsArray[0];
             for (const key in firstItem) {
                 if (typeof firstItem[key] === 'number' && firstItem[key] > 1000000000) {
                     timestampField = key;
                     console.log(`  猜测时间戳字段为: ${timestampField}`);
                     break;
                 }
             }
        }
        if (!timestampField) {
             console.warn('  仍然无法确定时间戳字段，将使用整个数组');
             return itemsArray; // 返回所有数据
        }
    }

    console.log(`📅 使用时间戳字段: ${timestampField}`);

    // 按时间戳降序排序（最新的在前）
    const sortedItems = [...itemsArray].sort((a, b) => {
        const tsA = a[timestampField];
        const tsB = b[timestampField];
        // 确保比较的是数字
        const numA = typeof tsA === 'number' ? tsA : parseInt(tsA, 10);
        const numB = typeof tsB === 'number' ? tsB : parseInt(tsB, 10);
        return (isNaN(numB) ? 0 : numB) - (isNaN(numA) ? 0 : numA);
    });

    // 找到最新一天的日期（基于时间戳）
    const latestTimestampRaw = sortedItems[0][timestampField];
    const latestTimestamp = typeof latestTimestampRaw === 'number' ? latestTimestampRaw : parseInt(latestTimestampRaw, 10);
    if (isNaN(latestTimestamp)) {
        console.error('❌ 最新数据点的时间戳无效');
        return [];
    }
    // 判断时间戳是秒还是毫秒
    const isMilliseconds = latestTimestamp > 10000000000; // 大概以2286年为界
    const latestDate = new Date(isMilliseconds ? latestTimestamp : latestTimestamp * 1000);
    console.log(`📅 数据中的最新日期: ${latestDate.toISOString().split('T')[0]} (${latestTimestamp})`);

    // 计算 N 天前的日期
    const cutoffDate = new Date(latestDate);
    cutoffDate.setDate(latestDate.getDate() - days);
    const cutoffTimestampSec = Math.floor(cutoffDate.getTime() / 1000);
    const cutoffTimestampMs = cutoffDate.getTime();
    const cutoffTimestamp = isMilliseconds ? cutoffTimestampMs : cutoffTimestampSec;
    console.log(`📅 筛选截止日期 (>=): ${cutoffDate.toISOString().split('T')[0]} (${cutoffTimestamp})`);

    // 筛选出时间戳大于等于截止时间戳的数据
    const recentItems = sortedItems.filter(item => {
        const tsRaw = item[timestampField];
        const ts = typeof tsRaw === 'number' ? tsRaw : parseInt(tsRaw, 10);
        return !isNaN(ts) && ts >= cutoffTimestamp;
    });

    // 按时间升序排列（从早到晚），便于查看趋势
    recentItems.sort((a, b) => {
        const tsA = a[timestampField];
        const tsB = b[timestampField];
        const numA = typeof tsA === 'number' ? tsA : parseInt(tsA, 10);
        const numB = typeof tsB === 'number' ? tsB : parseInt(tsB, 10);
        return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
    });

    console.log(`📊 筛选出最近 ${days} 天的数据共 ${recentItems.length} 条`);
    return recentItems;
}

/**
 * 格式化并打印筛选后的数据
 * @param {Array} recentItems - 筛选后的数据项数组
 * @param {string} symbol - 股票代码
 * @param {string} timestampField - 用于显示和排序的时间戳字段名
 */
function displayRecentData(recentItems, symbol, timestampField = 'timestamp') {
    if (recentItems.length === 0) {
        console.log('📉 最近三十天没有数据');
        return;
    }

    console.log(`\n=== ${symbol} 最近三十天历史数据 ===`);
    console.log('日期时间 (UTC)       | 开盘价 | 最高价 | 最低价 | 收盘价 | 成交量');
    console.log('------------------------------------------------------------------------');

    recentItems.forEach(item => {
        // 使用确定的时间戳字段
        const tsRaw = item[timestampField];
        const ts = typeof tsRaw === 'number' ? tsRaw : parseInt(tsRaw, 10);
        // 判断是秒还是毫秒
        const isMilliseconds = ts > 10000000000;
        const date = new Date(isMilliseconds ? ts : ts * 1000);
        
        if (isNaN(date.getTime())) {
            console.warn(`  跳过无效日期的数据点:`, item);
            return;
        }

        // 优先使用 timestamp 字段，如果不存在则使用 timestamp_unix
        const timestamp = item.timestamp || item.timestamp_unix;
        let dateString;
        if (typeof timestamp === 'string') {
            dateString = timestamp; // 直接使用日期字符串
        } else if (typeof timestamp === 'number') {
            // 判断是秒还是毫秒
            const isMilliseconds = timestamp > 10000000000;
            const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);
            dateString = date.toISOString().replace('T', ' ').substring(0, 19); // YYYY-MM-DD HH:mm:ss
        } else {
            dateString = '日期无效';
        }

        // 确保数值字段存在并格式化
        const open = typeof item.open === 'number' ? item.open : (parseFloat(item.open) || 0);
        const high = typeof item.high === 'number' ? item.high : (parseFloat(item.high) || 0);
        const low = typeof item.low === 'number' ? item.low : (parseFloat(item.low) || 0);
        const close = typeof item.close === 'number' ? item.close : (parseFloat(item.close) || 0);
        const volume = typeof item.volume === 'number' ? item.volume : (parseInt(item.volume, 10) || 0);

        console.log(
            `${dateString} | ${open.toFixed(2).padStart(6)} | ${high.toFixed(2).padStart(6)} | ${low.toFixed(2).padStart(6)} | ${close.toFixed(2).padStart(6)} | ${volume.toString().padStart(10)}`
        );
    });
}

/**
 * 保存数据到 JSON 文件
 * @param {Object} data - 要保存的数据
 * @param {string} filename - 文件名
 */
function saveToFile(data, filename) {
    try {
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`\n💾 数据已保存到: ${filePath}`);
        console.log(`   文件大小: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error('❌ 保存文件失败:', error.message);
    }
}

/**
 * 将筛选后的数据保存到 MySQL 数据库
 * @param {Array} recentItems - 筛选后的数据项数组
 * @param {string} symbol - 股票代码
 */
async function saveToDatabase(recentItems, symbol) {
    if (recentItems.length === 0) {
        console.log('⚠️  没有数据需要保存到数据库');
        return;
    }

    let connection; // 声明连接变量
    try {
        // 3. 创建数据库连接
        connection = await mysql.createConnection(config.db);
        console.log('✅ 数据库连接成功');

        // 4. 准备 SQL 插入语句
        // 使用 INSERT ... ON DUPLICATE KEY UPDATE 来处理可能的重复数据
        // 假设 unique_symbol_time (symbol, data_timestamp_unix) 是唯一键
        const sql = `
            INSERT INTO stock_history 
            (symbol, data_timestamp, data_timestamp_unix, open_price, high_price, low_price, close_price, volume) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
                data_timestamp=VALUES(data_timestamp),
                open_price=VALUES(open_price),
                high_price=VALUES(high_price),
                low_price=VALUES(low_price),
                close_price=VALUES(close_price),
                volume=VALUES(volume)
        `;

        const values = recentItems.map(item => [
            symbol,
            item.timestamp,
            item.timestamp_unix,
            item.open,
            item.high,
            item.low,
            item.close,
            item.volume
        ]);

        const [result] = await connection.query(sql, [values]); // 注意这里包裹成二维数组
        // 注意：对于 INSERT ... ON DUPLICATE KEY UPDATE,
        // affectedRows 包含插入和更新的总行数
        // changedRows 只包含实际被修改的行数
        // insertedRows 没有直接提供，但可以通过 affectedRows 和 changedRows 计算
        console.log(`✅ 数据库保存完成。受影响的行数: ${result.affectedRows}`);

        // 7. 关闭数据库连接
        await connection.end();
        console.log('🔒 数据库连接已关闭');

    } catch (error) {
        console.error('❌ 保存数据到数据库时出错:', error.message);
        // 尝试关闭连接（如果已建立）
        if (connection) {
            try {
                await connection.end();
                console.log('🔒 (尝试) 数据库连接已关闭');
            } catch (closeError) {
                console.error('❌ 关闭数据库连接时也出错:', closeError.message);
            }
        }
        // 重新抛出错误，让主函数捕获
        throw error;
    }
}

// --- 主函数 ---
async function main() {
    console.log('=== Yahoo Finance 股票历史数据获取器 (最终修正版 - 处理数组格式 + 保存到MySQL) ===\n');

    const symbol = 'MSFT';
    const interval = '1d'; // 注意：你现在的数据是日线 '1d'
    const limit = 70;     

    try {
        // 1. 获取历史数据
        const limitNum = 50
        const historyData = await getStockHistory(symbol, interval, limit);

        // 2. 保存完整响应数据 (可选，如果需要)
        // saveToFile(historyData, `full-history-${symbol}.json`);

        // 3. 筛选最近七天的数据
        const recentItems = filterRecentDays(historyData,limitNum);

        // 4. 确定用于显示的时间戳字段 (这部分逻辑可能需要根据你实际的返回数据微调)
        let displayTimestampField = 'timestamp_unix'; // 通常使用 Unix 时间戳进行内部处理
        // 如果 recentItems[0] 有 timestamp 字段且是字符串 'YYYY-MM-DD'，也可以用它
        // if (recentItems.length > 0 && recentItems[0].timestamp && typeof recentItems[0].timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(recentItems[0].timestamp)) {
        //     displayTimestampField = 'timestamp';
        // }

        // 5. 显示筛选后的数据
        displayRecentData(recentItems, symbol, displayTimestampField);

        // 6. 保存筛选后的数据到 JSON 文件 (可选)
        const recentDataToSave = {
            meta: historyData.meta || {},
            recentItems: recentItems,
            filterInfo: {
                days: limitNum,
                itemCount: recentItems.length,
                timestampField: displayTimestampField
            }
        };
        saveToFile(recentDataToSave, `recent-${limitNum}days-${symbol}.json`);

        // 7. --- 新增：保存到 MySQL 数据库 ---
        await saveToDatabase(recentItems, symbol);

    } catch (error) {
        console.error('\n💥 主函数执行出错:', error.message);
        console.error('错误堆栈:', error.stack);
        process.exit(1);
    }

    console.log('\n✅ === 执行完成 ===');
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('程序执行出错:', error);
        process.exit(1);
    });
}

// 导出函数供其他模块使用
module.exports = {
    getStockHistory,
    filterRecentDays,
    displayRecentData,
    saveToFile,
    saveToDatabase // 导出新函数
};