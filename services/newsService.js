// services/newsService.js
const db = require('../db/mysql');

const {
  fetchNews,
  getLatestPressRelease,
  saveToDatabase
} = require('../save_latest_news');

exports.getNewsForSymbols = async (symbols) => {
  console.log(`正在获取 ${symbols.join(', ')} 的最新新闻...`);

  // 1. 尝试从数据库查询现有新闻
  const placeholders = symbols.map(() => '?').join(', ');
  const sql = `SELECT * FROM latest_news WHERE symbol IN (${placeholders})`;
  const [rows] = await db.execute(sql, symbols);
  console.log(`✅ 从缓存中获取到 ${rows.length} 条新闻`);

  // 2. 在后台异步刷新新闻 (不阻塞当前响应)
  // 这个逻辑是 "fire and forget"，它会尝试更新，但不会影响本次返回给用户的数据
  symbols.forEach(async (symbol) => {
    try {
      const newsList = await fetchNews(symbol);
      const latestNews = await getLatestPressRelease(newsList);
      if (latestNews) { // 确保有新闻才保存
        await saveToDatabase(symbol, latestNews);
        console.log(`✅ 异步更新新闻成功: ${symbol}`);
      } else {
        console.log(`ℹ️ ${symbol} 没有新的新闻可以更新`);
      }
    } catch (err) {
      // 这里的 catch 只记录后台更新的错误，不会影响主响应
      console.error(`❌ 异步更新新闻失败: ${symbol}`, err.message);
    }
  });

  // 3. 立即返回从数据库中找到的新闻，即使是空数组
  // *** 关键修改：移除抛出错误的部分 ***
  // if (rows.length === 0) {
  //   throw new Error('没有找到相关新闻'); // <--- 问题根源，注释或删除此块
  // }

  console.log(`✅ 成功返回 ${rows.length} 条缓存新闻`);
  return rows; // 直接返回 rows，如果没找到，它就是一个空数组 []
};