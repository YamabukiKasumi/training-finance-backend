const axios = require('axios');
const fs = require('fs');
const mysql = require('mysql2/promise');
const config = require('./config');

const { host, key } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const ENDPOINT = config.api.endpoints.quote;
const API_URL = `${BASE_URL}${ENDPOINT}`;


async function fetchQuote(ticker, type) {
  try {
    console.log(`📡 正在请求行情数据: symbol=${ticker}, type=${type}`);

    const response = await axios.get(API_URL, {
      params: {
        ticker: ticker, // e.g., 'VFIAX'
        type: type      // e.g., 'MUTUALFUNDS'
    },
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host,
      },
      timeout: 15000,
    });

    console.log('\n=== 响应元数据 ===');
    console.log('状态:', response.data.meta?.status);
    console.log('处理时间:', response.data.meta?.processedTime);

    if (response.data && response.data.body) {
      const quote = response.data.body;
      return quote; // 返回完整的行情数据
    //   return {
    //     ...quote,
    //     symbol: ticker,
    //     stockType: type, // 添加 type 信息返回
    //   };
    } else {
      console.log('❌ 数据结构不符合预期');
      return null;
    }
  } catch (error) {
    console.error(`❌ 获取行情失败: symbol=${ticker}, type=${type} =>`, error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 写入 JSON 文件
async function writeToJSON(symbol, quoteData) {
    try{
        const filePath = `./stock_realtime_${symbol}.json`;
        fs.writeFileSync(filePath, JSON.stringify(quoteData, null, 2));
        console.log(`✅ JSON 写入完成：${filePath}`);
    } catch (error) {
        console.error(`❌ 写入 JSON 文件失败：${filePath}`, error.message);
    }
  
}

// 统一清理数据，处理 undefined/null 值，去掉 $ 和逗号，转为 float
async function cleanData(quoteData) {
  const cleanNumber = (str) => {
        if (!str || str === 'N/A') return null;
        // 移除 $, +, % 和逗号
        const cleaned = str.replace(/[$,+%]/g, '').replace(/,/g, '');
        return parseFloat(cleaned);
    };

    // 辅助函数：处理成交量字符串
    const parseVolume = (str) => {
        if (!str || str === 'N/A') return null;
        // 移除逗号后转换为整数
        return parseInt(str.replace(/,/g, ''));
    };

    // 主处理逻辑
    return {
        symbol: quoteData.symbol,
        stockType: quoteData.stockType,
        lastSalePrice: cleanNumber(quoteData.primaryData.lastSalePrice),
        netChange: cleanNumber(quoteData.primaryData.netChange),
        percentageChange: cleanNumber(quoteData.primaryData.percentageChange),
        deltaIndicator: quoteData.primaryData.deltaIndicator,
        volume: parseVolume(quoteData.primaryData.volume)
    };
}


// 写入或更新 stock_market 数据表
async function saveToStockMarket(cleanData) {
  const dbConfig = config.db;
  const connection = await mysql.createConnection(dbConfig);


  try {
    console.log('✅ 成功连接数据库，准备写入 stock_market 表');

    const query = `
      INSERT INTO stock_market 
        (symbol, stockType, lastSalePrice, netChange, percentageChange, deltaIndicator, volume)
      VALUES ( ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        symbol = VALUES(symbol),
        stockType = VALUES(stockType),
        lastSalePrice = VALUES(lastSalePrice),
        netChange = VALUES(netChange),
        percentageChange = VALUES(percentageChange),
        deltaIndicator = VALUES(deltaIndicator),
        volume = VALUES(volume)
    `;

    const params = [
      cleanData.symbol,
      cleanData.stockType,
      cleanData.lastSalePrice,
      cleanData.netChange,
      cleanData.percentageChange,
      cleanData.deltaIndicator,
      cleanData.volume
    ];

    await connection.execute(query, params);
    console.log(`✅ stock_market 数据写入成功：${cleanData.symbol}`);
  } catch (error) {
    console.error(`❌ stock_market 数据插入失败 symbol=${cleanData.symbol}:`, error.message);
    console.error(`🧪 数据详情:`, JSON.stringify(cleanData, null, 2));

  } finally {
    await connection.end();
    console.log('🔒 数据库连接已关闭');
  }
}



async function main(){
    const STOCKS = config.stockTypes.STOCKS;
    const ETF = config.stockTypes.ETF;
    const MUTUALFUND = config.stockTypes.MUTUALFUND;
    // const symbolsWithType = [
    //     // 示例股票和类型
    //     { ticker: 'AAPL', type: STOCKS },
    //     { ticker: 'SPY', type: ETF },
    //     { ticker: 'VFIAX', type: MUTUALFUND },
    // ];
    const symbolsWithType = [
        // 示例股票和类型
        { ticker: 'AAPL', type: STOCKS }];

    for (const { ticker, type } of symbolsWithType) {
      try {
        const quoteData = await fetchQuote(ticker, type);
        // console.log('✅ 获取结果:', quoteData);

        console.log(`\n🔍 写入 JSON 文件：${ticker}`);
        await writeToJSON(ticker, quoteData);

        console.log(`\n🔍 清理数据：${ticker}`);
        const cleanedData = await cleanData(quoteData);
        console.log('🧪 清理后的数据:', cleanedData);
        
        console.log(`\n🔍 写入 stock_market 数据表：${ticker}`);
        await saveToStockMarket(cleanedData);

      } catch (err) {
        console.error(`❌ 错误处理 symbol=${ticker}`, err.message);
      }
    }
}

main();
