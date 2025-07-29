// config.js
module.exports = {
  rapidapi: {
    yahooFinance: {
      host: 'yahoo-finance15.p.rapidapi.com',
      key: '1df83dd948msh18d852f961571f2p140ef4jsn3353c9eb4c81' // 新的key
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
    ratingSnapshotEndpoint: '/ratings-snapshot', // *** 1. 新增评分端点 ***
    historicalPriceFullEndpoint: '/historical-price-eod/full', // *** 新增这个端点 ***
    apiKey: 'mh1PytCioaQIwCWp2rQhQU2RmUR5Fw4I', // 替换为你的 FMP API Key
  },
  // *** 新增获取指数信息的默认符号和间隔 ***
  indexConfig: {
    defaultSymbols: ['^GSPC', '^DJI', '^IXIC', '^RUT', '^FTSE', '^N225', '^HSI'],
    requestIntervalMs: 300, // 每个请求之间的间隔，单位毫秒 (根据FMP的速率限制调整，例如500ms)
  },
  // *** 2. 新增评级服务的配置 ***
  ratingConfig: {
    requestIntervalMs: 100, // 每次API请求之间的间隔，单位毫秒
    allowedSymbols: new Set([ // 使用 Set 数据结构以便快速查询
      'AAPL', 'TSLA', 'AMZN', 'MSFT', 'NVDA', 'GOOGL', 'META', 'NFLX', 'JPM', 
      'V', 'BAC', 'AMD', 'PYPL', 'DIS', 'T', 'PFE', 'COST', 'INTC', 'KO', 
      'TGT', 'NKE', 'SPY', 'BA', 'BABA', 'XOM', 'WMT', 'GE', 'CSCO', 'VZ', 
      'JNJ', 'CVX', 'PLTR', 'SQ', 'SHOP', 'SBUX', 'SOFI', 'HOOD', 'RBLX', 
      'SNAP', 'UBER', 'FDX', 'ABBV', 'ETSY', 'MRNA', 'LMT', 'GM', 'F', 
      'RIVN', 'LCID', 'CCL', 'DAL', 'UAL', 'AAL', 'TSM', 'SONY', 'ET', 'NOK', 
      'MRO', 'COIN', 'SIRI', 'RIOT', 'CPRX', 'VWO', 'SPYG', 'ROKU', 'VIAC', 
      'ATVI', 'BIDU', 'DOCU', 'ZM', 'PINS', 'TLRY', 'WBA', 'MGM', 'NIO', 
      'C', 'GS', 'WFC', 'ADBE', 'PEP', 'UNH', 'CARR', 'FUBO', 'HCA', 'TWTR', 
      'BILI'
      // 注意：重复的 symbol (如 AMD, SOFI 等) 在 Set 中会自动去重
    ])
  }
};