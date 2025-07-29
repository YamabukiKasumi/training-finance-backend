// routes/holdingsRoutes.js
const express = require('express');
const router = express.Router();
const holdingsController = require('../controllers/holdingsController');


/**
 * @swagger
 * /api/portfolio/my-holdings:
 *   get:
 *     summary: Obtain the current user's position income situation
 *     description: |
 *       Obtain all holding records from the database, combine historical purchase prices and real-time market conditions,
 *       and calculate the returns, total market value, cost and other information of each stock
 *     responses:
 *       200:
 *         description: Successfully returned the portfolio data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calculationTime:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-29T15:30:00Z"
 *                 totalCostBasis:
 *                   type: number
 *                   example: 15230.50
 *                 totalMarketValue:
 *                   type: number
 *                   example: 16780.20
 *                 totalProfit:
 *                   type: number
 *                   example: 1549.70
 *                 totalReturnPercent:
 *                   type: number
 *                   example: 10.18
 *                 holdings:
 *                   type: array
 *                   description: Detailed holding information of each stock
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                         example: AAPL
 *                       quantity:
 *                         type: number
 *                         example: 20
 *                       purchaseTimestampUnix:
 *                         type: integer
 *                         example: 1704067200
 *                       purchaseDate:
 *                         type: string
 *                         format: date
 *                         example: "2024-01-01"
 *                       costBasisPerShare:
 *                         type: number
 *                         nullable: true
 *                         example: 152.34
 *                       costBasisTotal:
 *                         type: number
 *                         nullable: true
 *                         example: 3046.80
 *                       currentPrice:
 *                         type: number
 *                         nullable: true
 *                         example: 167.90
 *                       marketValue:
 *                         type: number
 *                         nullable: true
 *                         example: 3358.00
 *                       profit:
 *                         type: number
 *                         nullable: true
 *                         example: 311.20
 *                       returnPercent:
 *                         type: number
 *                         nullable: true
 *                         example: 10.22
 *                       note:
 *                         type: string
 *                         nullable: true
 *                         example: The current price acquisition failed
 *       500:
 *         description: Failed to retrieve portfolio data or database connection error
 */


// 定义GET请求的路由
router.get('/my-holdings', holdingsController.getMyHoldings);

module.exports = router;