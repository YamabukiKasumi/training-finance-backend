// controllers/ratingController.js
const { successResponse, errorResponse } = require('../utils/response');
const ratingService = require('../services/ratingService');

exports.getPortfolioRating = async (req, res) => {
  console.log('接收到获取投资组合综合评分的请求');

  try {
    const ratingData = await ratingService.calculateAveragePortfolioRating();
    res.json(successResponse(ratingData));
  } catch (err) {
    console.error('计算投资组合评分失败:', err);
    res.status(500).json(errorResponse('服务器内部错误，无法计算投资组合评分'));
  }
};