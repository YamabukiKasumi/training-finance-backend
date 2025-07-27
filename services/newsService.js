const db = require('../db/mysql');

exports.getNewsForSymbols = async (symbols) => {
  console.log(`正在获取 ${symbols} 的最新新闻...`);
  const placeholders = symbols.map(() => '?').join(', ');
  const sql = `SELECT * FROM latest_news WHERE symbol IN (${placeholders})`;
  const [rows] = await db.execute(sql, symbols);
    if (rows.length === 0) {
        throw new Error('没有找到相关新闻');
    }
    console.log(`✅ 成功获取 ${symbols.length} 个 symbol 的最新新闻`);

  return rows;
};
