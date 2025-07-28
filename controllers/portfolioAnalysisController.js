// controllers/portfolioAnalysisController.js
const { successResponse, errorResponse } = require('../utils/response');
const portfolioAnalysisService = require('../services/portfolioAnalysisService');

exports.getAssetAllocation = async (req, res) => {
  console.log('接收到获取资产分布的请求');

  try {
    const allocationData = await portfolioAnalysisService.calculateAssetAllocation();
    res.json(successResponse(allocationData));
  } catch (err) {
    console.error('计算资产分布失败:', err);
    res.status(500).json(errorResponse('服务器内部错误，无法计算资产分布'));
  }
};