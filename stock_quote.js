// correct-multi-stock-final.js
const axios = require('axios');

const config = require('./config');

const { host, key } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const ENDPOINT = config.api.endpoints.quotes;
const API_URL = `${BASE_URL}${ENDPOINT}`;

async function getMultipleStocks(tickers) {
    try {
        console.log('正在请求股票数据:', tickers.join(', '));
        
        const response = await axios.get(API_URL, {
            params: {
                ticker: tickers.join(',')  // 使用普通逗号，不是%2C
            },
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': host,
            },
            timeout: 15000
        });

        console.log('\n=== 响应元数据 ===');
        console.log('状态:', response.data.meta?.status);
        console.log('处理时间:', response.data.meta?.processedTime);

        console.log('\n=== 正确解析后的多股票数据 ===');
        if (response.data && response.data.body && Array.isArray(response.data.body)) {
            response.data.body.forEach((stock, index) => {
                console.log(`\n${index + 1}. ${stock.symbol} - ${stock.shortName}`);
                console.log(`   当前价格: $${stock.regularMarketPrice}`);
                console.log(`   涨跌幅: ${stock.regularMarketChangePercent?.toFixed(2) || 'N/A'}%`);
                console.log(`   市值: $${stock.marketCap ? (stock.marketCap / 1000000000).toFixed(2) : 'N/A'}B`);
                console.log(`   PE: ${stock.trailingPE ? stock.trailingPE.toFixed(2) : 'N/A'}`);
                console.log(`   52周范围: $${stock.fiftyTwoWeekLow || 'N/A'} - $${stock.fiftyTwoWeekHigh || 'N/A'}`);
                console.log(`   成交量: ${stock.regularMarketVolume?.toLocaleString() || 'N/A'}`);
            });
            
            console.log(`\n📈 总共获取到 ${response.data.body.length} 只股票的数据`);
        } else {
            console.log('❌ 数据结构不符合预期');
            console.log('实际数据结构:', Object.keys(response.data));
        }
        
        // 保存完整数据
        const fs = require('fs');
        fs.writeFileSync('final-multi-stock-response.json', JSON.stringify(response.data, null, 2));
        console.log('\n💾 完整数据已保存到 final-multi-stock-response.json');
        
        return response.data;
        
    } catch (error) {
        console.error('❌ 请求失败:');
        console.error('错误信息:', error.message);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// 主函数
async function main() {
    console.log('=== 正确的多股票数据获取器 ===\n');
    
    // 获取多个股票数据
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'SPY', 'EEM', 'VFIAX'];
    const result = await getMultipleStocks(tickers);
    
    if (result && result.body) {
        console.log('\n🎉 获取成功!');
    } else {
        console.log('\n💥 获取失败');
    }
}

main();