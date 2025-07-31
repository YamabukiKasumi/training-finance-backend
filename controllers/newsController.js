const { successResponse, errorResponse } = require('../utils/response');
const newsService = require('../services/newsService');

exports.getNewsBySymbols = async (req, res) => {
  // const { symbols } = req.body;
  let symbols = req.headers.symbols;
  console.log(`接收到的请求参数 symbols: ${symbols}`);
   if (!symbols) {
    return res.status(400).json(errorResponse('Request param symbols is mandatory.'));
  }

  // 将字符串拆成数组（兼容单个/多个）
  if (typeof symbols === 'string') {
    symbols = symbols.split(',').map(s => s.trim().toUpperCase());
  }

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json(errorResponse('Request param symbols must be a non-empty array.'));
  }
  console.log(`接收到的请求参数 symbols: ${symbols.join(', ')}`);

  try {
    const newsList = await newsService.getNewsForSymbols(symbols);
    res.json(successResponse(newsList));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse('Server Internal Error, cannot fetch news.'));
  }
};
