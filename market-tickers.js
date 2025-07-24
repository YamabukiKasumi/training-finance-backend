// market-tickers.js
const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// 从配置中获取API设置
const { host, key } = config.rapidapi.yahooFinance;
const baseUrl = config.api.baseUrl;
const tickersEndpoint = config.api.endpoints.tickers;

/**
 * 获取市场股票数据
 * @param {number} page - 页码，默认为1
 * @param {string} type - 类型，默认为STOCKS
 * @returns {Promise<Object>} 股票数据
 */
async function getMarketTickers(page = 1, type = 'STOCKS') {
    try {
        const url = `${baseUrl}${tickersEndpoint}`;
        
        // 请求参数
        const params = {
            page: page,
            type: type
        };

        // 请求头
        const headers = {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': host,
        };

        console.log(`正在获取第 ${page} 页的 ${type} 数据...`);

        // 发送GET请求
        const response = await axios.get(url, {
            params: params,
            headers: headers,
            timeout: config.settings.timeout
        });

        console.log(`成功获取第 ${page} 页数据，共 ${response.data.length} 条记录`);
        return response.data;
    } catch (error) {
        console.error(`获取第 ${page} 页数据失败:`, error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        throw error;
    }
}

/**
 * 获取多页数据
 * @param {number} totalPages - 要获取的总页数
 * @param {string} type - 类型
 * @returns {Promise<Array>} 所有数据的数组
 */
async function getAllMarketTickers(totalPages = 3, type = 'STOCKS') {
    const allData = [];
    
    for (let page = 1; page <= totalPages; page++) {
        try {
            const pageData = await getMarketTickers(page, type);
            allData.push(...pageData);
            
            // 添加延迟避免请求过于频繁
            if (page < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(`获取第 ${page} 页数据时出错，跳过此页:`, error.message);
            // 继续获取下一页，不中断整个过程
        }
    }
    
    return allData;
}

/**
 * 格式化并显示股票数据
 * @param {Array} tickers - 股票数据数组
 */
function displayTickers(tickers) {
    console.log('\n=== 股票数据概览 ===');
    console.log(`总共获取到 ${tickers.length} 只股票\n`);
    
    // 显示前10只股票的基本信息
    tickers.slice(0, 10).forEach((ticker, index) => {
        console.log(`${index + 1}. ${ticker.symbol} - ${ticker.shortName || ticker.longName}`);
        console.log(`   当前价格: $${ticker.regularMarketPrice}`);
        console.log(`   涨跌幅: ${ticker.regularMarketChangePercent?.toFixed(2)}%`);
        console.log(`   市值: $${(ticker.marketCap / 1000000000).toFixed(2)}B`);
        console.log(`   PE: ${ticker.trailingPE?.toFixed(2) || 'N/A'}`);
        console.log('---');
    });
    
    if (tickers.length > 10) {
        console.log(`... 还有 ${tickers.length - 10} 只股票`);
    }
}

/**
 * 保存数据到JSON文件
 * @param {Array} data - 要保存的数据
 * @param {string} filename - 文件名
 */
function saveToFile(data, filename = 'market-tickers-data.json') {
    try {
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`\n数据已保存到: ${filePath}`);
        console.log(`文件大小: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error('保存文件失败:', error.message);
    }
}

/**
 * 分析数据
 * @param {Array} tickers - 股票数据数组
 */
function analyzeData(tickers) {
    console.log('\n=== 数据分析 ===');
    
    // 计算平均价格
    const prices = tickers
        .map(t => t.regularMarketPrice)
        .filter(price => price && !isNaN(price));
    
    if (prices.length > 0) {
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        console.log(`平均股价: $${avgPrice.toFixed(2)}`);
    }
    
    // 找出涨幅最大的股票
    const sortedByGain = [...tickers]
        .filter(t => t.regularMarketChangePercent)
        .sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent);
    
    if (sortedByGain.length > 0) {
        console.log('\n涨幅前3的股票:');
        sortedByGain.slice(0, 3).forEach((ticker, index) => {
            console.log(`  ${index + 1}. ${ticker.symbol}: ${ticker.regularMarketChangePercent.toFixed(2)}%`);
        });
    }
    
    // 按市值分组
    const marketCapGroups = {
        '大型股 (>100B)': 0,
        '中型股 (10B-100B)': 0,
        '小型股 (<10B)': 0
    };
    
    tickers.forEach(ticker => {
        if (ticker.marketCap) {
            const capInBillions = ticker.marketCap / 1000000000;
            if (capInBillions >= 100) {
                marketCapGroups['大型股 (>100B)']++;
            } else if (capInBillions >= 10) {
                marketCapGroups['中型股 (10B-100B)']++;
            } else {
                marketCapGroups['小型股 (<10B)']++;
            }
        }
    });
    
    console.log('\n市值分布:');
    Object.entries(marketCapGroups).forEach(([group, count]) => {
        console.log(`  ${group}: ${count} 只`);
    });
}

// 主函数
async function main() {
    console.log('=== Yahoo Finance 市场股票数据获取器 ===\n');
    
    try {
        // 获取第一页数据进行测试
        console.log('1. 获取第一页股票数据:');
        const firstPageData = await getMarketTickers(1, 'STOCKS');
        displayTickers(firstPageData);
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        // 获取多页数据
        console.log('2. 获取多页股票数据:');
        const allData = await getAllMarketTickers(3, 'STOCKS'); // 获取前3页
        
        if (allData.length > 0) {
            displayTickers(allData);
            analyzeData(allData);
            saveToFile(allData, 'yahoo-finance-tickers.json');
        } else {
            console.log('未获取到有效数据');
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
    getMarketTickers,
    getAllMarketTickers,
    displayTickers,
    saveToFile,
    analyzeData
};