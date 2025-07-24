// yahoo-finance-search.js
const axios = require('axios');

// 配置RapidAPI的请求头
const rapidapiKey = 'fba5e829cdmsh4f79c0cc3919ecfp13159fjsn8cfd25be27df';
const rapidapiHost = 'yahoo-finance15.p.rapidapi.com';

// 获取市场搜索结果的函数
async function searchMarket(query) {
    try {
        // 构造请求URL
        const url = `https://${rapidapiHost}/api/v1/markets/search`; 

        // 请求参数
        const params = {
            search: query,
        };

        // 请求头
        const headers = {
            'X-RapidAPI-Key': rapidapiKey,
            'X-RapidAPI-Host': rapidapiHost,
        };

        // 发送GET请求
        const response = await axios.get(url, {
            params: params,
            headers: headers,
        });

        // 返回数据
        return response.data;
    } catch (error) {
        console.error('Error fetching market search data:', error.message);
        throw error;
    }
}

// 主函数 - 演示如何使用
async function main() {
    console.log('=== Yahoo Finance Market Search ===\n');

    try {
        // 查询关键词 "AAPL"
        console.log('1. 查询关键词 "AAPL":');
        const appleSearchResults = await searchMarket('AAPL');
        console.log(JSON.stringify(appleSearchResults, null, 2));

        console.log('\n' + '='.repeat(50) + '\n');

        // 查询关键词 "GOOGL"
        console.log('2. 查询关键词 "GOOGL":');
        const googleSearchResults = await searchMarket('GOOGL');
        console.log(JSON.stringify(googleSearchResults, null, 2));
    } catch (error) {
        console.error('主函数执行错误:', error.message);
    }

    console.log('\n=== 演示完成 ===');
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main().catch(console.error);
}