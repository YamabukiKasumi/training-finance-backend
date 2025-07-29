// routes/dailyPerformanceRoutes.js
const express = require('express');
const router = express.Router();
const dailyPerformanceController = require('../controllers/dailyPerformanceController');


/**
 * @swagger
 * /api/portfolio/daily-performance:
 *   get:
 *     summary: Get daily portfolio performance
 *     description: Returns the daily performance of the investment portfolio for the past 30 days, including total assets, daily profit and loss, and return rate.
 *     parameters:
 *       - in: query
 *         name: endDateStr
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "End date (format: YYYY-MM-DD), defaults to today"
 *     responses:
 *       200:
 *         description: Successfully returned daily performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     example: "2025-07-28"
 *                   totalAssets:
 *                     type: number
 *                     example: 10234.56
 *                   dailyProfitLoss:
 *                     type: number
 *                     example: -123.45
 *                   dailyReturnPercentage:
 *                     type: number
 *                     example: -1.19
 *       500:
 *         description: Internal server error
 */


// 定义一个 GET 请求的路由来获取每日表现数据
router.get('/daily-performance', dailyPerformanceController.getDailyPerformance);

module.exports = router;