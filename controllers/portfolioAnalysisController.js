// controllers/portfolioAnalysisController.js
const { successResponse, errorResponse } = require('../utils/response');
const portfolioAnalysisService = require('../services/portfolioAnalysisService');

exports.getAssetAllocation = async (req, res) => {
  console.log('Receive the request of acquiring assest distrubution.');

  try {
    const allocationData = await portfolioAnalysisService.calculateAssetAllocation();
    res.json(successResponse(allocationData));
  } catch (err) {
    console.error('Fail to calculate the assest distribution:', err);
    res.status(500).json(errorResponse('Server Internal Error, cannot calculate assests distribution.'));
  }
};