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
      quote: '/api/v1/markets/quote'
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
  }
};