exports.successResponse = (data, msg = '获取成功') => ({
  status: 'success',
  msg,
  data,
});

exports.errorResponse = (msg = '请求失败') => ({
  status: 'error',
  msg,
  data: null,
});
