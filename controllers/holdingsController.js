// controllers/holdingsController.js
const { successResponse, errorResponse } = require('../utils/response');
const holdingsService = require('../services/holdingsService');

exports.getMyHoldings = async (req, res) => {
  // 对于GET请求，通常参数通过req.query（查询参数）或req.params（路由参数）获取。
  // 由于getMyHoldingsPortfolio不需要外部传入参数，这里不需要从req.query或req.params获取。
  // 如果未来需要根据用户ID获取持仓，可以在这里从 req.query 或 req.params 获取用户ID。
  // 例如：const userId = req.query.userId;
  console.log('接收到获取用户持仓的请求');

  try {
    const portfolioData = await holdingsService.getMyHoldingsPortfolio();
    res.json(successResponse(portfolioData));
  } catch (err) {
    console.error('获取用户持仓失败:', err);
    // 根据错误类型可以返回不同的状态码和错误信息
    res.status(500).json(errorResponse('Server Internal Error, cannot fetch holdings portfolio.'));
  }
};