// stock-quote.js
const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// 从配置中获取API设置
const { host, key } = config.rapidapi.yahooFinance;
const baseUrl = config.api.baseUrl;
const quoteEndpoint = config.api.endpoints.quote;
const stockTypes = config.stockTypes;

/**
 * 获取股票报价数据
 * @param {string} ticker - 股票代码
 * @param {string} type - 股票类型
 * @returns {Promise<Object>} 报价数据
 */
async function getStockQuote(ticker, type = 'STOCKS') {
    try {
        const url = `${baseUrl}${quoteEndpoint}`;
        
        // 请求参数
        const params = {
            ticker: ticker,
            type: type
        };

        // 请求头
        const headers = {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': host,
        };

        console.log(`正在获取 ${ticker} (${type}) 的报价数据...`);

        // 发送GET请求
        const response = await axios.get(url, {
            params: params,
            headers: headers,
            timeout: config.settings.timeout
        });

        console.log(`成功获取 ${ticker} 的报价数据`);
        return response.data;
    } catch (error) {
        console.error(`获取 ${ticker} 的报价数据失败:`, error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            if (error.response.data) {
                console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
            }
        }
        throw error;
    }
}

/**
 * 获取多个股票的报价
 * @param {Array} tickers - 股票代码数组
 * @param {string} type - 股票类型
 * @returns {Promise<Array>} 所有股票报价数据
 */
async function getMultipleQuotes(tickers, type = 'STOCKS') {
    const results = [];
    const errors = [];

    for (const ticker of tickers) {
        try {
            const quoteData = await getStockQuote(ticker, type);
            results.push({
                ticker: ticker,
                data: quoteData,
                success: true
            });
            // 添加延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            errors.push({
                ticker: ticker,
                error: error.message,
                success: false
            });
        }
    }

    return {
        results,
        errors,
        totalCount: tickers.length,
        successCount: results.length,
        errorCount: errors.length
    };
}

/**
 * 格式化显示股票报价数据
 * @param {Object} quoteData - 报价数据
 * @param {string} ticker - 股票代码
 */
function displayQuote(quoteData, ticker) {
    console.log(`\n=== ${ticker} 股票报价 ===`);
    
    if (!quoteData) {
        console.log('未获取到报价数据');
        return;
    }

    // 基本信息
    if (quoteData.symbol) {
        console.log(`股票代码: ${quoteData.symbol}`);
    }
    if (quoteData.shortName || quoteData.longName) {
        console.log(`公司名称: ${quoteData.shortName || quoteData.longName}`);
    }

    // 价格信息
    if (quoteData.regularMarketPrice) {
        console.log(`当前价格: $${quoteData.regularMarketPrice}`);
    }
    if (quoteData.regularMarketPreviousClose) {
        console.log(`前收盘价: $${quoteData.regularMarketPreviousClose}`);
    }
    if (quoteData.regularMarketChange) {
        const change = quoteData.regularMarketChange;
        const changePercent = quoteData.regularMarketChangePercent || (change / quoteData.regularMarketPreviousClose * 100);
        console.log(`涨跌额: $${change.toFixed(2)}`);
        console.log(`涨跌幅: ${changePercent.toFixed(2)}%`);
    }

    // 交易信息
    if (quoteData.regularMarketDayHigh) {
        console.log(`今日最高: $${quoteData.regularMarketDayHigh}`);
    }
    if (quoteData.regularMarketDayLow) {
        console.log(`今日最低: $${quoteData.regularMarketDayLow}`);
    }
    if (quoteData.regularMarketVolume) {
        console.log(`成交量: ${quoteData.regularMarketVolume.toLocaleString()}`);
    }

    // 市场信息
    if (quoteData.marketCap) {
        console.log(`市值: $${(quoteData.marketCap / 1000000000).toFixed(2)}B`);
    }
    if (quoteData.trailingPE) {
        console.log(`市盈率(TTM): ${quoteData.trailingPE.toFixed(2)}`);
    }
    if (quoteData.dividendYield) {
        console.log(`股息率: ${quoteData.dividendYield}%`);
    }

    // 52周信息
    if (quoteData.fiftyTwoWeekLow && quoteData.fiftyTwoWeekHigh) {
        console.log(`52周范围: $${quoteData.fiftyTwoWeekLow} - $${quoteData.fiftyTwoWeekHigh}`);
    }

    // 市场状态
    if (quoteData.marketState) {
        console.log(`市场状态: ${quoteData.marketState}`);
    }
    if (quoteData.exchange) {
        console.log(`交易所: ${quoteData.exchange}`);
    }
}

/**
 * 比较多个股票
 * @param {Array} quoteResults - 股票报价结果数组
 */
function compareQuotes(quoteResults) {
    console.log('\n=== 股票对比 ===');
    console.log('股票代码    当前价格    涨跌幅    成交量        市值');
    console.log('-'.repeat(60));

    quoteResults.forEach(result => {
        if (result.success && result.data) {
            const data = result.data;
            const price = data.regularMarketPrice ? `$${data.regularMarketPrice.toFixed(2)}` : 'N/A';
            const change = data.regularMarketChangePercent ? `${data.regularMarketChangePercent.toFixed(2)}%` : 'N/A';
            const volume = data.regularMarketVolume ? data.regularMarketVolume.toLocaleString() : 'N/A';
            const marketCap = data.marketCap ? `$${(data.marketCap / 1000000000).toFixed(1)}B` : 'N/A';
            
            console.log(`${result.ticker.padEnd(10)} ${price.padEnd(10)} ${change.padEnd(8)} ${volume.padEnd(12)} ${marketCap}`);
        } else {
            console.log(`${result.ticker.padEnd(10)} 获取失败`);
        }
    });
}

/**
 * 保存数据到JSON文件
 * @param {Object} data - 要保存的数据
 * @param {string} filename - 文件名
 */
function saveToFile(data, filename) {
    try {
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`\n数据已保存到: ${filePath}`);
        console.log(`文件大小: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error('保存文件失败:', error.message);
    }
}

// 主函数
async function main() {
    console.log('=== Yahoo Finance 股票报价获取器 ===\n');
    
    try {
        // 测试单个股票报价
        console.log('1. 获取苹果股票(AAPL)报价:');
        const appleQuote = await getStockQuote('AAPL', 'STOCKS');
        displayQuote(appleQuote, 'AAPL');
        saveToFile(appleQuote, 'AAPL-quote.json');

        console.log('\n' + '='.repeat(60) + '\n');

        // 测试多个股票报价
        console.log('2. 获取多个股票报价:');
        const tickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
        const multipleQuotes = await getMultipleQuotes(tickers, 'STOCKS');
        
        console.log(`\n成功获取 ${multipleQuotes.successCount}/${multipleQuotes.totalCount} 只股票的报价`);
        
        // 显示对比
        compareQuotes(multipleQuotes.results);
        
        // 详细显示每个股票
        console.log('\n=== 详细报价信息 ===');
        multipleQuotes.results.forEach(result => {
            if (result.success) {
                displayQuote(result.data, result.ticker);
                console.log('\n' + '-'.repeat(40));
            }
        });
        
        // 保存所有数据
        saveToFile(multipleQuotes, 'multiple-quotes.json');
        
        // 显示错误信息
        if (multipleQuotes.errors.length > 0) {
            console.log('\n=== 获取失败的股票 ===');
            multipleQuotes.errors.forEach(error => {
                console.log(`${error.ticker}: ${error.error}`);
            });
        }

    } catch (error) {
        console.error('主函数执行错误:', error.message);
        process.exit(1);
    }
    
    console.log('\n=== 执行完成 ===');
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
    getStockQuote,
    getMultipleQuotes,
    displayQuote,
    compareQuotes,
    saveToFile
};