// controllers/indexController.js
const { successResponse, errorResponse } = require('../utils/response');
const indexService = require('../services/indexService');

exports.getCommonIndexes = async (req, res) => {
  console.log('接收到获取常见指数信息的请求');

  try {
    const indexesInfo = await indexService.getAllIndexesInfo();
    // 检查是否获取到数据，如果没有，可以返回一个特定的消息
    if (indexesInfo.length === 0) {
      return res.json(successResponse([], 'Cannot find any indexes\' information.'));
    }
    res.json(successResponse(indexesInfo));
  } catch (err) {
    console.error('获取常见指数信息失败:', err);
    // 使用你的通用错误响应函数
    res.status(500).json(errorResponse('Server Internal Error, cannot fetch common indexes information.'));
  }
};