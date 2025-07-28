// app.js：与前端进行交互的入口文件，负责处理路由和请求
const express = require('express');
const cors = require('cors');

const newsRoutes = require('./routes/news');
const holdingsRoutes = require('./routes/myholdings'); // 新增的路由
const indexRoutes = require('./routes/indexRoutes'); // *** 新增的路由 ***
// const quoteRoutes = require('./routes/quote');
// const historyRoutes = require('./routes/history');
const PORT = 3001;

const app = express();

// app.use(cors());
app.use(express.json()); // 解析 JSON 格式的请求体  

app.use('/api/stocks', newsRoutes);     // 把 newsRoutes 中定义的所有路由 挂载到 /api/stocks 路径下
app.use('/api/portfolio', holdingsRoutes); // 为新的持仓路由添加前缀
app.use('/api/indexes', indexRoutes); // *** 为新的指数路由添加前缀 ***
// // app.use('/api/stocks', quoteRoutes);
// app.use('/api/stocks', historyRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  // 总是打印完整的错误堆栈到服务器控制台，便于调试
  console.error(err); // 打印整个 err 对象，而不仅仅是 err.stack

  // 默认错误信息
  let errorMessage = '服务器内部错误';
  let statusCode = 500; // 默认 500

  // 尝试从错误对象中获取更具体的错误信息
  if (err instanceof Error) {
    errorMessage = err.message;
  }
  // 如果是 Axios 错误 (例如 API 调用失败)，可能包含 response.status
  if (err.response && err.response.status) {
      statusCode = err.response.status;
      // 可以在这里根据 statusCode 调整 errorMessage
      // 例如：if (statusCode === 404) errorMessage = "外部服务未找到";
  }

  // 使用你的 errorResponse 工具函数来构建响应
  // 注意：errorResponse 已经处理了 code 和 message
  res.status(statusCode).json(errorResponse(errorMessage, statusCode));
  // 或者如果你想在错误响应中包含详细的错误栈（不推荐在生产环境），可以这样：
  // res.status(statusCode).json(errorResponse(errorMessage, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});