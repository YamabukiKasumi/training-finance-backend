const axios = require('axios');
const fs = require('fs');
const mysql = require('mysql2/promise');
const config = require('./config');

const { host, key } = config.rapidapi.yahooFinance;
const BASE_URL = config.api.baseUrl;
const ENDPOINT = config.api.endpoints.news;
const API_URL = `${BASE_URL}${ENDPOINT}`;



// 获取 API 返回数据
async function fetchNews(tickers) {
    try {
        // 统一转换为数组
        const tickersArray = Array.isArray(tickers) ? tickers : [tickers];

        console.log('正在请求最新新闻数据:', tickersArray.join(', '));

        const response = await axios.get(API_URL, {
            params: { ticker: tickersArray.join(',') },
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': host,
            },
            timeout: 15000
        });
    
        console.log('\n=== 响应元数据 ===');
        console.log('状态:', response.data.meta?.status);
        console.log('处理时间:', response.data.meta?.processedTime);
        // console.log('返回新闻数据:', JSON.stringify(response.data.body?.[0], null, 2));

    
        if (response.data && response.data.body && Array.isArray(response.data.body)) {
            return response.data.body;
        } else {
            console.log('❌ 数据结构不符合预期');
        }
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        throw error; // 重新抛出错误以便后续处理
    }
}

// 过滤并选取 PRESS_RELEASE 类型中最新的一条
async function getLatestPressRelease(newsList) {
  console.log(`🧾 接收到 ${newsList?.length || 0} 条新闻`);

  if (!Array.isArray(newsList) || newsList.length === 0) {
    console.warn('⚠️ 新闻列表为空或不是数组');
    return null;
  }


  newsList.sort((a, b) => new Date(b.time) - new Date(a.time));
  console.log('🗓️ 新闻已按时间降序排序');
  console.log('最新新闻:', JSON.stringify(newsList[0], null, 2));
  return newsList[0];
}

// 将新闻写入 JSON 文件
async function writeToJSON(symbol, news) {
    try{
        const filePath = `./news_${symbol}.json`;
        fs.writeFileSync(filePath, JSON.stringify(news, null, 2));
        console.log(`✅ JSON 写入完成：${filePath}`);
    } catch (error) {
        console.error(`❌ 写入 JSON 文件失败：${filePath}`, error.message);
    }
  
}

// 写入或更新数据库
async function saveToDatabase(symbol, news) {
  const dbConfig = config.db;
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('✅ 数据库连接成功');

    const publishedAt = new Date(news.time);
    if (isNaN(publishedAt.getTime())) {
      console.error(`❌ 无效时间格式，跳过 symbol=${symbol}:`, news.time);
      return;
    }

    const query = `
      INSERT INTO latest_news 
        (symbol, title, url, img, summary, source, type, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        title = VALUES(title),
        url = VALUES(url),
        img = VALUES(img),
        summary = VALUES(summary),
        source = VALUES(source),
        type = VALUES(type),
        published_at = VALUES(published_at)
    `;

    const params = [
      symbol,
      news.title || '',
      news.url || '',
      news.img || '',
      news.text || '',
      news.source || '',
      news.type || '',
      publishedAt,
    ];

    await connection.execute(query, params);
    console.log(`✅ 数据库存储成功：${symbol}`);
  } catch (error) {
    console.error(`❌ 插入数据库失败 symbol=${symbol}:`, error.message);
  } finally {
    await connection.end();
    console.log('🔒 数据库连接已关闭');
  }
}

async function main() {
    // 需要保存新闻的股票 symbol（可多支）
    const symbols = ['AAPL', 'NVDA', 'SPY', 'EEM', 'VFIAX'];
    
    console.log('=== 最新新闻数据获取器 ===\n');
    for (const symbol of symbols) {
        try {
            const newsList = await fetchNews(symbol);
            const latestNews = await getLatestPressRelease(newsList);
            console.log(`\n🔍 测试排序函数---最新新闻：${symbol}`, latestNews);
            if (latestNews) {
                // 保存到 JSON 文件和数据库
                writeToJSON(symbol, latestNews);
                await saveToDatabase(symbol, latestNews);
                
            } else {
                console.log(`⚠️ 无 PRESS_RELEASE 新闻：${symbol}`);
            }             
        
        } catch (err) {
            console.error(`❌ 错误处理 symbol=${symbol}`, err.message);
        }
    }
}

if (require.main === module) {
  main(); 
}

module.exports = {
  fetchNews,
  getLatestPressRelease,
  saveToDatabase
};


