const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

// router.post('/news', newsController.getNewsBySymbols);  // post请求，获取指定股票的最新新闻
router.post('/market', marketController.getMarketData);

module.exports = router;