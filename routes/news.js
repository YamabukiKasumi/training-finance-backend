const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');


/**
 * @swagger
 * /api/stocks/news:
 *   get:
 *     summary: Get stock-related news
 *     description: |
 *       Obtain the corresponding news information based on the incoming stock codes (symbols). 
 *       symbols parameters can be passed in either through query parameters or through request headers.
 *     parameters:
 *       - in: query
 *         name: symbols
 *         schema:
 *           type: string
 *           example: AAPL,SPY
 *         required: false
 *         description: Stock codes separated by commas, such as AAPL and SPY
 *       - in: header
 *         name: symbols
 *         schema:
 *           type: string
 *           example: AAPL,SPY
 *         required: false
 *         description: (Optional) symbols can also be provided through HTTP Headers
 *     responses:
 *       200:
 *         description: Successfully returned the news data
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
 *         description: Missing symbols parameter or format error
 *       500:
 *         description: Internal server error
 */


// router.post('/news', newsController.getNewsBySymbols);  // post请求，获取指定股票的最新新闻
router.get('/news', newsController.getNewsBySymbols);

module.exports = router;
