// services/indexService.js
const axios = require('axios');
const config = require('../config');

const FMP_BASE_URL = config.financialModelingPrep.baseUrl;
const FMP_QUOTE_ENDPOINT = config.financialModelingPrep.quoteEndpoint;
const FMP_API_KEY = config.financialModelingPrep.apiKey;

const DEFAULT_INDEX_SYMBOLS = config.indexConfig.defaultSymbols;
const REQUEST_INTERVAL_MS = config.indexConfig.requestIntervalMs;

/**
 * 延迟函数
 * @param {number} ms 毫秒
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取单个指数的实时报价信息
 * @param {string} symbol 指数代码 (例如: ^GSPC)
 * @returns {Promise<Object|null>} 提取后的指数信息对象或 null (如果获取失败)
 */
async function getIndexQuote(symbol) {
    const url = `${FMP_BASE_URL}${FMP_QUOTE_ENDPOINT}`;
    try {
        console.log(`🔍 Fetch ${symbol}'s price from FMP...`);
        const response = await axios.get(url, {
            params: {
                symbol: symbol,
                apikey: FMP_API_KEY
            },
            timeout: 10000 // 10 秒超时
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const indexData = response.data[0];
            // 只提取需要的字段
            const extractedData = {
                symbol: indexData.symbol,
                name: indexData.name,
                price: parseFloat(indexData.price.toFixed(2)),
                changePercentage: parseFloat(indexData.changePercentage.toFixed(4)) // 保留4位小数
            };
            console.log(`✅ Successfully fetch ${symbol}'s price': ${JSON.stringify(extractedData)}`);
            return extractedData;
        } else {
            console.warn(`⚠️ Data structure from FMP API is invalid for ${symbol}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Fail to fetch ${symbol}'s price from FMP':`, error.message);
        if (error.response) {
            console.error('  Error code:', error.response.status);
            console.error('  Response:', error.response.data);
        }
        return null; // 返回 null 允许其他指数继续处理
    }
}

/**
 * 获取所有常见指数的实时报价信息
 * @returns {Promise<Array<Object>>} 所有指数信息的数组
 */
async function getAllIndexesInfo() {
    console.log('\n=== Fetching all common indexes\' information ===');
    const allIndexesData = [];

    for (let i = 0; i < DEFAULT_INDEX_SYMBOLS.length; i++) {
        const symbol = DEFAULT_INDEX_SYMBOLS[i];
        if (i > 0) {
            // 在每个请求之间添加延迟，除了第一个请求
            await delay(REQUEST_INTERVAL_MS);
            console.log(`⏱️ Delay ${REQUEST_INTERVAL_MS}ms and then request ${symbol}...`);
        }
        const indexInfo = await getIndexQuote(symbol);
        if (indexInfo) {
            allIndexesData.push(indexInfo);
        }
    }

    console.log(`✅ Done, ${allIndexesData.length} records`);
    return allIndexesData;
}

module.exports = {
    getAllIndexesInfo
};