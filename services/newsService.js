const db = require('../db/mysql');

const {
  fetchNews,
  getLatestPressRelease,
  saveToDatabase
} = require('../save_latest_news');

exports.getNewsForSymbols = async (symbols) => {
  console.log(`正在获取 ${symbols} 的最新新闻...`);
  const placeholders = symbols.map(() => '?').join(', ');
  const sql = `SELECT * FROM latest_news WHERE symbol IN (${placeholders})`;
  const [rows] = await db.execute(sql, symbols);
  //   if (rows.length === 0) {
  //       throw new Error('没有找到相关新闻');
  //   }
  //   console.log(`✅ 成功获取 ${symbols.length} 个 symbol 的最新新闻`);

  // return rows;

  // 1️⃣ 异步刷新每个 symbol 的新闻
  symbols.forEach(async (symbol) => {
    try {
      const newsList = await fetchNews(symbol);
      const latestNews = await getLatestPressRelease(newsList);
      await saveToDatabase(symbol, latestNews);
      console.log(`✅ 异步更新新闻成功: ${symbol}`);
    } catch (err) {
      console.error(`❌ 异步更新新闻失败: ${symbol}`, err.message);
    }
  });

  // 2️⃣ 立即返回已有新闻数据
  if (rows.length === 0) {
    throw new Error('没有找到相关新闻');
  }

  console.log(`✅ 成功返回 ${rows.length} 条缓存新闻`);
  return rows;
};
