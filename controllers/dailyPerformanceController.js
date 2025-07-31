// controllers/dailyPerformanceController.js
const { successResponse, errorResponse } = require('../utils/response');
const dailyPerformanceService = require('../services/dailyPerformanceService');

exports.getDailyPerformance = async (req, res) => {
  // 从查询参数中获取可选的截止日期
  const { endDate } = req.query; 

  console.log(`接收到获取每日投资组合表现的请求 (截止日期: ${endDate || '今天'})`);

  try {
    const performanceData = await dailyPerformanceService.getDailyPortfolioPerformance(endDate);
    res.json(successResponse(performanceData));
  } catch (err) {
    console.error('计算每日投资组合表现失败:', err);
    res.status(500).json(errorResponse('Server Internal Error, cannot calculate daily performance.'));
  }
};