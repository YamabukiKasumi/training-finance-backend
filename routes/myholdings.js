// routes/holdingsRoutes.js
const express = require('express');
const router = express.Router();
const holdingsController = require('../controllers/holdingsController');


/**
 * @swagger
 * /api/portfolio/my-holdings:
 *   get:
 *     summary: 获取当前用户的持仓收益情况
 *     description: 从数据库中获取所有持仓记录，结合历史买入价和实时行情，计算每只股票的收益、总市值、成本等信息。
 *     responses:
 *       200:
 *         description: 成功返回投资组合数据
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
 *                   description: 每只股票的详细持仓信息
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
 *                         example: 当前价格获取失败
 *       500:
 *         description: 服务器内部错误或数据库连接失败
 */


// 定义GET请求的路由
router.get('/my-holdings', holdingsController.getMyHoldings);

module.exports = router;