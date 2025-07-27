// app.js：与前端进行交互的入口文件，负责处理路由和请求
const express = require('express');
const cors = require('cors');

const newsRoutes = require('./routes/news');
// const quoteRoutes = require('./routes/quote');
// const historyRoutes = require('./routes/history');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/stocks', newsRoutes);     // 把 newsRoutes 中定义的所有路由 挂载到 /api/stocks 路径下
// app.use('/api/stocks', quoteRoutes);
// app.use('/api/stocks', historyRoutes);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
