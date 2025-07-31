// 假设从数据库或外部 API 获取市场数据
const db = require('../db/mysql');
const { successResponse, errorResponse } = require('../utils/response');

const{
  fetchQuote,
  writeToJSON,
  cleanData,
  fillMissingStockType,
  saveToStockMarket
} = require('../stock_market');

exports.getMarketDataForSymbols = async (symbols) => {
  // 构造占位符 ((?, ?), (?, ?), ...)
  const placeholders = symbols.map(() => '(?, ?)').join(', ');
  // 构造 SQL, SQL 中用 LOWER() 来忽略大小写
  const sql = `SELECT * FROM stock_market_new WHERE (symbol, stockType) IN (${placeholders})`;
  // 构造参数数组 ['AAPL', 'STOCKS', 'SPY', 'ETF', 'VFIAX', 'MUTUALFUNDS'],因为数据库只接受“平铺的一维数组”来绑定占位符
  const values = symbols.flatMap(item => [item.ticker, item.type]);

  const [rows] = await db.execute(sql, values);

// // 1️⃣ 异步刷新每个 symbol 的新闻
  // symbols.forEach(async (symbol) => {
  //   try {
  //     const quoteData = await fetchQuote(ticker, type);
        // console.log('✅ 获取结果:', quoteData);

        // console.log(`\n🔍 写入 JSON 文件：${ticker}`);
        // await writeToJSON(ticker, quoteData);

        // console.log(`\n🔍 清理数据：${ticker}`);
        // const cleanedData = await cleanData(quoteData);
        // console.log('🧪 清理后的数据:', cleanedData);

        // console.log(`\n🔍 填充ETF类型缺失的 stockType：${ticker}`)
        // const filledData = await fillMissingStockType([cleanedData]);
        // console.log('🧪 填充后的数据:', filledData[0]);

        
        // console.log(`\n🔍 写入 stock_market 数据表：${ticker}`);
        // await saveToStockMarket(filledData[0]);

  //     console.log(`✅ 异步更新大盘成功: ${symbol}`);
  //   } catch (err) {
  //     console.error(`❌ 异步更新大盘失败: ${symbol}`, err.message);
  //   }
  // });

  // 2️⃣ 立即返回已有股票市场数据
  if (rows.length === 0) {
    throw new Error('Cannot find any relevant stock market data');
  }

  console.log(`✅ Return ${rows.length} cached records`);

  return rows;
};
