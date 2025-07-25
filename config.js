// config.js
module.exports = {
  rapidapi: {
    yahooFinance: {
      host: 'yahoo-finance15.p.rapidapi.com',
      key: 'fba5e829cdmsh4f79c0cc3919ecfp13159fjsn8cfd25be27df'
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
  }
};