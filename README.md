# training-finance-backend

**stock_quote.js** Fetch a specified stock information.

**test.js** Fetch several information using domestic apis.

**recent.js** Fetch the history of a specified stock and save to database.

~~**information_to_db.js(deprecated)** Fetch the information of holding stocks and save them to database.~~

**information_to_db_new.js** Fetch the information of holding stocks and save them to database.

**calculate_portfolio_value.js** Calculate the total value in real time.

**save_latest_news.js** Fetch the latest news about stock/ETF and save to DB.

The return value is a json object, which is shown as follows:
```
{
  "calculationTime": "2025-07-25T03:45:20.418Z",
  "totalMarketValue": 61071.83,
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 85,
      "currentPrice": 213.76,
      "marketValue": 18169.6
    },
    {
      "symbol": "MSFT",
      "quantity": 47,
      "currentPrice": 510.88,
      "marketValue": 24011.36
    },
    ...
  ]
}
```
