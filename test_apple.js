// correct-aapl-parser.js
const axios = require('axios');
const config = require('./config');

const { host, key } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const ENDPOINT = config.api.endpoints.quote;
const API_URL = `${BASE_URL}${ENDPOINT}`;

async function getAAPLData() {
    try {
        console.log('正在请求AAPL数据...');
        
        const response = await axios.get(API_URL, {
            params: {
                ticker: 'AAPL'
            },
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': host,
            },
            timeout: 30000,
        });

        console.log('\n=== 完整响应数据 ===');
        console.log(JSON.stringify(response.data, null, 2));
        
        // 正确解析数据结构
        console.log('\n=== 正确解析后的数据 ===');
        if (response.data && response.data.body && Array.isArray(response.data.body)) {
            const stockData = response.data.body[0];
            console.log('股票代码:', stockData.symbol);
            console.log('公司名称:', stockData.shortName);
            console.log('当前价格:', stockData.regularMarketPrice);
            console.log('涨跌幅:', stockData.regularMarketChangePercent + '%');
            console.log('市值:', (stockData.marketCap / 1000000000).toFixed(2) + 'B');
            console.log('市盈率:', stockData.trailingPE);
            console.log('52周最高:', stockData.fiftyTwoWeekHigh);
            console.log('52周最低:', stockData.fiftyTwoWeekLow);
        } else {
            console.log('数据结构不符合预期');
        }
        
        // 保存完整数据
        const fs = require('fs');
        fs.writeFileSync('aapl-full-response.json', JSON.stringify(response.data, null, 2));
        console.log('\n完整数据已保存到 aapl-full-response.json');
        
    } catch (error) {
        console.error('请求失败:');
        console.error('错误信息:', error.message);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

getAAPLData();