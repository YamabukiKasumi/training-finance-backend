// routes/holdingsRoutes.js
const express = require('express');
const router = express.Router();
const holdingsController = require('../controllers/holdingsController');

// 定义GET请求的路由
router.get('/my-holdings', holdingsController.getMyHoldings);

module.exports = router;