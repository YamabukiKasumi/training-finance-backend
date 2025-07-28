// routes/portfolioAnalysisRoutes.js
const express = require('express');
const router = express.Router();
const portfolioAnalysisController = require('../controllers/portfolioAnalysisController');

// 定义一个 GET 请求的路由来获取资产分布数据
router.get('/asset-allocation', portfolioAnalysisController.getAssetAllocation);

module.exports = router;