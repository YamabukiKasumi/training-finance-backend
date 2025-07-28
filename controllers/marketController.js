const { successResponse, errorResponse } = require('../utils/response');
const marketService = require('../services/marketService');

// app.use(express.json()); // 允许解析 JSON body

// 获取指定市场（如指数）的行情数据
exports.getMarketData = async (req, res) => {
  let symbols = req.body;

  console.log(`接收到的请求参数 symbols: ${symbols}`);

  
  // 校验是否为数组
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json(errorResponse('请求体应为包含股票对象的非空数组'));
  }

  // 校验每一项是否含有 ticker 和 type
  const invalidItems = symbols.filter(item =>
    !item || typeof item.ticker !== 'string' || typeof item.type !== 'string'
  );

  if (invalidItems.length > 0) {
    return res.status(400).json(errorResponse('每项必须包含字符串类型的 ticker 和 type'));
  }

  // 你可以统一处理为大写 ticker
  const cleanedSymbols = symbols.map(item => ({
    ticker: item.ticker.trim(),  
    type: item.type.trim()
  }));

  console.log('处理后的 symbols:', cleanedSymbols);

  try {
    const marketData = await marketService.getMarketDataForSymbols(cleanedSymbols);
    res.json(successResponse(marketData));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse('服务器内部错误'));
  }
};
