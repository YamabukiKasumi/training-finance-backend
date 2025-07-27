# training-finance-backend

**stock_quote.js** Fetch a specified stock information.

**test.js** Fetch several information using domestic apis.

**recent.js** Fetch the history of a specified stock and save to database.

~~**information_to_db.js(deprecated)** Fetch the information of holding stocks and save them to database.~~

**information_to_db_new.js** Fetch the information of holding stocks and save them to database.

**calculate_portfolio_value.js** Calculate the total value in real time.

**save_latest_news.js** Fetch the latest news about stock/ETF and save to DB.

**stock_market.js** Fetch the realtime quote date and save to DB for the optional function.

The return value is a json object, which is shown as follows:
```
{
  "calculationTime": "2025-07-25T08:04:44.299Z",
  "totalCostBasis": 89361.74,
  "totalMarketValue": 91562.49,
  "totalProfit": 2200.75,
  "totalReturnPercent": 2.46,
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 87,
      "purchaseTimestampUnix": 1752192000,
      "costBasisPerShare": 212.41,
      "costBasisTotal": 18479.67,
      "currentPrice": 213.76,
      "marketValue": 18597.12,
      "profit": 117.45,
      "returnPercent": 0.64
    },
    {
      "symbol": "MSFT",
      "quantity": 16,
      "purchaseTimestampUnix": 1753315200,
      "costBasisPerShare": 505.87,
      "costBasisTotal": 8093.92,
      "currentPrice": 510.88,
      "marketValue": 8174.08,
      "profit": 80.16,
      "returnPercent": 0.99
    },
    ......
  ]
}
```
