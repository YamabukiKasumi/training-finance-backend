// utils/response.js
const http = require('http'); // 导入整个http模块

function formatResponse({ code, message, data = null }) {
  return {
    code,
    message,
    data
  };
}

// 成功响应，默认使用 200 OK
function successResponse(data = null, message = '成功', code = 200) { // 直接使用数字状态码
  return formatResponse({ code, message, data });
}

// 错误响应，默认使用 500 Internal Server Error
function errorResponse(message = '服务器错误', code = 500, data = null) { // 直接使用数字状态码
  return formatResponse({ code, message, data });
}

exports.successResponse = successResponse;
exports.errorResponse = errorResponse;