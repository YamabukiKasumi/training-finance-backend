const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

/**
 * @swagger
 * /api/stocks/market:
 *   post:
 *     summary: 获取股票市场行情
 *     description: 提交股票代码和类型列表，返回对应市场行情数据。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - ticker
 *                 - type
 *               properties:
 *                 ticker:
 *                   type: string
 *                   example: AAPL
 *                 type:
 *                   type: string
 *                   example: Common Stock
 *     responses:
 *       200:
 *         description: 成功返回市场行情数据
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ticker:
 *                     type: string
 *                     example: AAPL
 *                   price:
 *                     type: number
 *                     format: float
 *                     example: 192.35
 *                   change:
 *                     type: number
 *                     format: float
 *                     example: -0.53
 *                   percentChange:
 *                     type: string
 *                     example: "-0.27%"
 *                   lastUpdated:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-07-29T14:30:00Z
 *       400:
 *         description: 请求体格式错误或缺少字段
 *       500:
 *         description: 服务器内部错误
 */

// router.post('/news', newsController.getNewsBySymbols);  // post请求，获取指定股票的最新新闻
router.post('/market', marketController.getMarketData);

module.exports = router;