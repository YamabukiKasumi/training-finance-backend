// routes/dailyPerformanceRoutes.js
const express = require('express');
const router = express.Router();
const dailyPerformanceController = require('../controllers/dailyPerformanceController');

// 定义一个 GET 请求的路由来获取每日表现数据
router.get('/daily-performance', dailyPerformanceController.getDailyPerformance);

module.exports = router;