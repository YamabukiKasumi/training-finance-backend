// routes/portfolioAnalysisRoutes.js
const express = require('express');
const router = express.Router();
const portfolioAnalysisController = require('../controllers/portfolioAnalysisController');


/**
 * @swagger
 * /api/portfolio/asset-allocation:
 *   get:
 *     summary: Obtain the asset distribution of the investment portfolio
 *     description: |
 *          Obtain the current holding information from the database and external stock apis, 
 *          and calculate the total market value of various assets and their proportion in the portfolio
 *     responses:
 *       200:
 *         description: The asset allocation analysis results were successfully returned
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: ETF
 *                     description: Asset Type
 *                   totalValue:
 *                     type: number
 *                     format: float
 *                     example: 12500.75
 *                     description: Total market value of this asset class
 *                   percentage:
 *                     type: number
 *                     format: float
 *                     example: 35.82
 *                     description: "The percentage of this asset class in the portfolio (unit: %)"
 *       500:
 *         description: Analysis failed or database/API error
 */



// 定义一个 GET 请求的路由来获取资产分布数据
router.get('/asset-allocation', portfolioAnalysisController.getAssetAllocation);

module.exports = router;