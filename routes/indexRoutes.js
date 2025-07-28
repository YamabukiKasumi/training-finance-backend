// routes/indexRoutes.js
const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// 定义GET请求的路由
router.get('/common-indexes', indexController.getCommonIndexes);

module.exports = router;