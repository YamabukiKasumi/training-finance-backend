// routes/ratingRoutes.js
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

router.get('/rating', ratingController.getPortfolioRating);

module.exports = router;