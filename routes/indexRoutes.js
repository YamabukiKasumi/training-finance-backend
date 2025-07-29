// routes/indexRoutes.js
const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');


/**
 * @swagger
 * /api/indexes/common-indexes:
 *   get:
 *     summary: Get real-time quotations for common indices
 *     description: |
 *       Call external financial APIs (such as FMP) to obtain real-time quotation information for common indices (e.g., S&P 500, NASDAQ, Dow Jones, etc.).
 *     responses:
 *       200:
 *         description: Successfully returned the index data array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   symbol:
 *                     type: string
 *                     example: ^GSPC
 *                   name:
 *                     type: string
 *                     example: S&P 500
 *                   price:
 *                     type: number
 *                     format: float
 *                     example: 5450.32
 *                   changePercentage:
 *                     type: number
 *                     format: float
 *                     example: -0.3421
 *       500:
 *         description: Failed to retrieve index data or FMP API error
 */


// 定义GET请求的路由
router.get('/common-indexes', indexController.getCommonIndexes);

module.exports = router;