const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

router.post('/news', newsController.getNewsBySymbols);  // post请求，获取指定股票的最新新闻

module.exports = router;
