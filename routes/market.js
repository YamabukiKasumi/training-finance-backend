const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

/**
 * @swagger
 * /api/stocks/market:
 *   post:
 *     summary: Obtain market data for all stocks
 *     description: Submit the list of stock codes and types, and return the corresponding market data
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
 *         description: Successfully returned market data
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
 *         description: Request a type error or missing field
 *       500:
 *         description: Internal server error
 */

// router.post('/news', newsController.getNewsBySymbols);  // post请求，获取指定股票的最新新闻
router.post('/market', marketController.getMarketData);

module.exports = router;