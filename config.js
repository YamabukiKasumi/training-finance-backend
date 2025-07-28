// config.js
module.exports = {
  rapidapi: {
    yahooFinance: {
      host: 'yahoo-finance15.p.rapidapi.com',
      key: '6c1145dd7bmsh7bd7f45ee4bc0fbp11d873jsn05fb8b00a89a'
    }
  },
  api: {
    baseUrl: 'https://yahoo-finance15.p.rapidapi.com', 
    endpoints: {
      tickers: '/api/v2/markets/tickers',
      search: '/api/v1/markets/search',
      quote: '/api/v1/markets/quote',
      quotes: '/api/v1/markets/stock/quotes',
      history: '/api/v2/markets/stock/history',
      news: '/api/v2/markets/news'
    }
  },
  settings: {
    timeout: 10000,
    maxRetries: 3
  },
  stockTypes: {
    STOCKS: 'STOCKS',
    ETF: 'ETF',
    MUTUALFUND: 'MUTUALFUND',
    MUTUALFUNDS: 'MUTUALFUNDS',
    CRYPTOCURRENCY: 'CRYPTOCURRENCY'
  },
  db: {
  host: 'localhost',     // 你的 MySQL 服务器地址
  user: 'root', // 你的 MySQL 用户名
  password: '202507', // 你的 MySQL 密码
  database: 'finance_data', // 你的数据库名
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
  },
  // *** 新增 FMP API 配置 ***
  financialModelingPrep: {
    baseUrl: 'https://financialmodelingprep.com/stable/', // 实际的基准URL，以便将来扩展
    quoteEndpoint: '/quote', // 指数报价的相对路径
    apiKey: 'mh1PytCioaQIwCWp2rQhQU2RmUR5Fw4I', // 替换为你的 FMP API Key
  },
  // *** 新增获取指数信息的默认符号和间隔 ***
  indexConfig: {
    defaultSymbols: ['^GSPC', '^DJI', '^IXIC', '^RUT', '^FTSE', '^N225', '^HSI'],
    requestIntervalMs: 500, // 每个请求之间的间隔，单位毫秒 (根据FMP的速率限制调整，例如500ms)
  }
};