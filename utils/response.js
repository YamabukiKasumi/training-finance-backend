const { StatusCodes } = require('http');

function formatResponse({ code, message, data = null }) {
  return {
    code,
    message,
    data
  };
}

function successResponse(data = null, message = '成功', code = StatusCodes.OK) {
  return formatResponse({ code, message, data });
}

function errorResponse(message = '服务器错误', code = StatusCodes.INTERNAL_SERVER_ERROR, data = null) {
  return formatResponse({ code, message, data });
}

exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
