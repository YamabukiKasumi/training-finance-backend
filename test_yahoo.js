// yahoo-finance-search.js
const axios = require('axios');
const config = require('./config');

// 从配置中获取API设置
const { host, key } = config.rapidapi.yahooFinance;

// 获取市场搜索结果的函数
async function searchMarket(query) {
    try {
        const baseUrl = `https://${host}${config.api.endpoints.search}`; 
        
        const params = { search: query };
        const headers = {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': host,
        };

        const response = await axios.get(baseUrl, {
            params: params,
            headers: headers,
            timeout: config.settings.timeout
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching market search data:', error.message);
        throw error;
    }
}

// 主函数
async function main() {
    console.log('=== Yahoo Finance Market Search ===\n');

    try {
        console.log('1. 查询关键词 "AAPL":');
        const results = await searchMarket('AAPL');
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('主函数执行错误:', error.message);
    }

    console.log('\n=== 演示完成 ===');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { searchMarket };