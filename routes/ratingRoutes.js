// routes/ratingRoutes.js
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');


/**
 * @swagger
 * /api/portfolio/rating:
 *   get:
 *     summary: Calculate the comprehensive average rating of the portfolio
 *     description: |
 *       Based on the stocks held by the user, screen out the stocks that meet the conditions, 
 *       call the external API to obtain the rating data of individual stocks, calculate the comprehensive average score and return it.
 *     responses:
 *       200:
 *         description: Successfully calculated and returned the average rating score of the portfolio
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     averageDiscountedCashFlowScore:
 *                       type: number
 *                       format: float
 *                       description: The average value of discounted cash flow scores
 *                     averageReturnOnAssetsScore:
 *                       type: number
 *                       format: float
 *                       description: The average value of return on assets scores
 *                     averageDebtToEquityScore:
 *                       type: number
 *                       format: float
 *                       description: The average value of debt to equity scores
 *                     averagePriceToEarningsScore:
 *                       type: number
 *                       format: float
 *                       description: The average value of price to earnings scores
 *                     averagePriceToBookScore:
 *                       type: number
 *                       format: float
 *                       description: The average value of price to book scores
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Explanatory information may indicate that there are no rated positions or the rating has failed
 *                   example:
 *                     message: "There are no holdings available for rating."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error information
 */


router.get('/rating', ratingController.getPortfolioRating);

module.exports = router;