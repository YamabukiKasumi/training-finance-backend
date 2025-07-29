const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');


/**
 * @swagger
 * /api/stocks/news:
 *   get:
 *     summary: 获取股票相关新闻
 *     description: 根据传入的股票代码（symbols）获取对应的新闻信息。symbols 参数既可以通过查询参数，也可以通过请求头传入。
 *     parameters:
 *       - in: query
 *         name: symbols
 *         schema:
 *           type: string
 *           example: AAPL,SPY
 *         required: false
 *         description: 用逗号分隔的股票代码，如 AAPL,SPY
 *       - in: header
 *         name: symbols
 *         schema:
 *           type: string
 *           example: AAPL,SPY
 *         required: false
 *         description: （可选）也可以通过 HTTP Header 提供 symbols
 *     responses:
 *       200:
 *         description: 成功返回新闻数据
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   symbol:
 *                     type: string
 *                     example: AAPL
 *                   title:
 *                     type: string
 *                     example: Apple reaches all-time high
 *                   summary:
 *                     type: string
 *                     example: Apple Inc. stock hit a record high today due to strong earnings.
 *                   url:
 *                     type: string
 *                     example: https://news.example.com/apple-high
 *                   publishedAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-07-29T10:00:00Z
 *       400:
 *         description: 缺少 symbols 参数或格式错误
 *       500:
 *         description: 服务器内部错误
 */


// router.post('/news', newsController.getNewsBySymbols);  // post请求，获取指定股票的最新新闻
router.get('/news', newsController.getNewsBySymbols);

module.exports = router;
