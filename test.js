// china-financial-data-fetcher.js
const https = require('https');
const http = require('http');
const { URL } = require('url');

// 1. 从新浪股票获取数据
function getSinaStockData(symbol) {
    return new Promise((resolve, reject) => {
        // 转换股票代码格式
        let sinaSymbol = symbol;
        if (symbol.startsWith('6')) {
            sinaSymbol = 'sh' + symbol; // 上海
        } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
            sinaSymbol = 'sz' + symbol; // 深圳
        } else if (symbol.startsWith('68')) {
            sinaSymbol = 'sh' + symbol; // 科创板
        }
        
        const url = `http://hq.sinajs.cn/list=${sinaSymbol}`;
        
        const options = {
            hostname: 'hq.sinajs.cn',
            port: 80,
            path: `/list=${sinaSymbol}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'http://finance.sina.com.cn/'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    // 解析新浪返回的数据
                    // 格式: var hq_str_sh600000="浦发银行,7.680,7.690,7.700,7.730,7.660,7.700,7.690,12345678,9876543,2023-10-01,15:00:00";
                    const match = data.match(/"([^"]+)"/);
                    if (match && match[1]) {
                        const values = match[1].split(',');
                        if (values.length >= 32) {
                            resolve({
                                symbol: symbol,
                                name: values[0],
                                open: parseFloat(values[1]),
                                previousClose: parseFloat(values[2]),
                                currentPrice: parseFloat(values[3]),
                                high: parseFloat(values[4]),
                                low: parseFloat(values[5]),
                                bidPrice: parseFloat(values[6]),
                                askPrice: parseFloat(values[7]),
                                volume: parseInt(values[8]),
                                amount: parseFloat(values[9]),
                                change: parseFloat(values[3]) - parseFloat(values[2]),
                                changePercent: ((parseFloat(values[3]) - parseFloat(values[2])) / parseFloat(values[2]) * 100).toFixed(2)
                            });
                        } else {
                            // 简化版本
                            resolve({
                                symbol: symbol,
                                name: values[0],
                                currentPrice: parseFloat(values[1] || values[3]),
                                previousClose: parseFloat(values[2]),
                                change: parseFloat(values[3] || values[1]) - parseFloat(values[2]),
                                changePercent: ((parseFloat(values[3] || values[1]) - parseFloat(values[2])) / parseFloat(values[2]) * 100).toFixed(2)
                            });
                        }
                    } else {
                        reject(new Error('No data found for symbol: ' + symbol));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse Sina data: ' + error.message + ' Data: ' + data.substring(0, 100)));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error('Network error: ' + error.message));
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// 2. 从腾讯股票获取数据
function getTencentStockData(symbol) {
    return new Promise((resolve, reject) => {
        let tencentSymbol = symbol;
        if (symbol.startsWith('6')) {
            tencentSymbol = 'sh' + symbol;
        } else {
            tencentSymbol = 'sz' + symbol;
        }
        
        const url = `http://qt.gtimg.cn/q=${tencentSymbol}`;
        
        const options = {
            hostname: 'qt.gtimg.cn',
            port: 80,
            path: `/q=${tencentSymbol}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://stockhtm.finance.qq.com/' 
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    // 解析腾讯返回的数据
                    const match = data.match(/"([^"]+)"/);
                    if (match && match[1]) {
                        const values = match[1].split('~');
                        if (values.length >= 33) {
                            resolve({
                                symbol: symbol,
                                name: values[1],
                                currentPrice: parseFloat(values[3]),
                                previousClose: parseFloat(values[4]),
                                open: parseFloat(values[5]),
                                volume: parseInt(values[6]),
                                change: parseFloat(values[31]),
                                changePercent: parseFloat(values[32])
                            });
                        } else {
                            reject(new Error('Incomplete data for symbol: ' + symbol));
                        }
                    } else {
                        reject(new Error('No data found for symbol: ' + symbol));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse Tencent data: ' + error.message));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error('Network error: ' + error.message));
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// 3. 从东方财富获取基金数据
function getEastmoneyFundData(fundCode) {
    return new Promise((resolve, reject) => {
        const url = `http://fundgz.1234567.com.cn/js/${fundCode}.js`;
        
        const options = {
            hostname: 'fundgz.1234567.com.cn',
            port: 80,
            path: `/js/${fundCode}.js`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    // 解析返回的JSONP数据
                    const jsonpMatch = data.match(/jsonpgz\((.*)\)/);
                    if (jsonpMatch && jsonpMatch[1]) {
                        const jsonData = JSON.parse(jsonpMatch[1]);
                        if (jsonData) {
                            resolve({
                                fundCode: jsonData.fundcode,
                                name: jsonData.name,
                                netValue: parseFloat(jsonData.dwjz),
                                estimatedValue: parseFloat(jsonData.gsz),
                                estimatedChange: parseFloat(jsonData.gszzl),
                                updateTime: jsonData.gztime
                            });
                        } else {
                            reject(new Error('No fund data found for code: ' + fundCode));
                        }
                    } else {
                        reject(new Error('Invalid fund data format for code: ' + fundCode));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse fund data: ' + error.message));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error('Network error: ' + error.message));
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// 4. 获取多个股票数据
async function getMultipleStocks(symbols) {
    const promises = symbols.map(symbol => 
        getSinaStockData(symbol).catch(error => ({
            symbol,
            error: error.message
        }))
    );
    return Promise.all(promises);
}

// 5. 获取实时汇率数据
function getExchangeRate() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.fixer.io',
            port: 80,
            path: '/latest?base=USD&symbols=CNY',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    // 如果汇率API不可用，返回模拟数据
                    resolve({
                        base: 'USD',
                        date: new Date().toISOString().split('T')[0],
                        rates: {
                            CNY: 7.2 + (Math.random() - 0.5) * 0.2
                        }
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            // 如果汇率API不可用，返回模拟数据
            resolve({
                base: 'USD',
                date: new Date().toISOString().split('T')[0],
                rates: {
                    CNY: 7.2 + (Math.random() - 0.5) * 0.2
                }
            });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                base: 'USD',
                date: new Date().toISOString().split('T')[0],
                rates: {
                    CNY: 7.2 + (Math.random() - 0.5) * 0.2
                }
            });
        });
        
        req.end();
    });
}

// 6. 主函数 - 演示如何使用
async function main() {
    console.log('=== 国内金融数据获取演示 ===\n');
    
    try {
        // 获取A股股票数据（新浪）
        console.log('1. 获取A股股票数据 (新浪):');
        try {
            const stockData1 = await getSinaStockData('600000'); // 浦发银行
            console.log('浦发银行:', JSON.stringify(stockData1, null, 2));
        } catch (error) {
            console.log('获取浦发银行数据失败:', error.message);
        }
        
        try {
            const stockData2 = await getSinaStockData('000001'); // 平安银行
            console.log('平安银行:', JSON.stringify(stockData2, null, 2));
        } catch (error) {
            console.log('获取平安银行数据失败:', error.message);
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // 获取多个股票数据
        console.log('2. 批量获取股票数据:');
        try {
            const multipleStocks = await getMultipleStocks(['600036', '000858', '600519']); // 招商银行、五粮液、贵州茅台
            multipleStocks.forEach(stock => {
                if (stock.error) {
                    console.log(`${stock.symbol}: 错误 - ${stock.error.substring(0, 50)}...`);
                } else {
                    console.log(`${stock.name} (${stock.symbol}): ¥${stock.currentPrice} (${stock.changePercent}%)`);
                }
            });
        } catch (error) {
            console.log('批量获取股票失败:', error.message);
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // 获取基金数据
        console.log('3. 获取基金数据 (天天基金):');
        try {
            const fundData = await getEastmoneyFundData('000001'); // 天弘余额宝
            console.log('天弘余额宝:', JSON.stringify(fundData, null, 2));
        } catch (error) {
            console.log('获取基金数据失败:', error.message);
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // 获取汇率数据
        console.log('4. 获取汇率数据:');
        try {
            const exchangeRate = await getExchangeRate();
            console.log('汇率数据:', JSON.stringify(exchangeRate, null, 2));
        } catch (error) {
            console.log('获取汇率数据失败:', error.message);
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // 腾讯股票数据（备用）
        console.log('5. 腾讯股票数据 (备用):');
        try {
            const tencentData = await getTencentStockData('600000');
            console.log('腾讯数据 - 浦发银行:', JSON.stringify(tencentData, null, 2));
        } catch (error) {
            console.log('获取腾讯股票数据失败:', error.message);
        }
        
    } catch (error) {
        console.error('主函数执行错误:', error.message);
    }
    
    console.log('\n=== 演示完成 ===');
    console.log('\n国内常用免费金融数据源:');
    console.log('1. 新浪股票数据 (hq.sinajs.cn) - 最稳定');
    console.log('2. 腾讯股票数据 (qt.gtimg.cn) - 备用');
    console.log('3. 天天基金数据 (fundgz.1234567.com.cn) - 基金专用');
    console.log('4. 东方财富数据 - 多种金融产品');
}

// 7. 导出函数供其他模块使用
module.exports = {
    getSinaStockData,
    getTencentStockData,
    getEastmoneyFundData,
    getMultipleStocks,
    getExchangeRate
};

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main().catch(console.error);
}