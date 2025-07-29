// routes/indexRoutes.js
const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');


/**
 * @swagger
 * /api/indexes/common-indexes:
 *   get:
 *     summary: 获取常见指数的实时报价
 *     description: 调用外部金融 API（如 FMP）获取常见指数（例如标普500、纳指、道琼斯等）的实时报价信息。
 *     responses:
 *       200:
 *         description: 成功返回指数数据数组
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
 *         description: 获取指数数据失败或 FMP API 错误
 */


// 定义GET请求的路由
router.get('/common-indexes', indexController.getCommonIndexes);

module.exports = router;