# training-finance-backend

**stock_quote.js** Fetch a specified stock information.

**test.js** Fetch several information using domestic apis.

**recent.js** Fetch the history of a specified stock and save to database.

~~**information_to_db.js(deprecated)** Fetch the information of holding stocks and save them to database.~~

**information_to_db_new.js** Fetch the information of holding stocks and save them to database.

**calculate_portfolio_value.js** Calculate the total value in real time.

**save_latest_news.js** Fetch the latest news about stock/ETF and save to DB.

**stock_market.js** Fetch the realtime quote date and save to DB for the optional function.

**services/holdingsService.js** Fetch the current price and the history price of the user holdings, then calculate the Profit and the returnPercent.
The return value is a json object, which is shown as follows:
```
{
    "code": 200,
    "message": "成功",
    "data": {
        "calculationTime": "2025-07-28T03:04:09.044Z",
        "totalCostBasis": 89361.74,
        "totalMarketValue": 92033.52,
        "totalProfit": 2671.78,
        "totalReturnPercent": 2.99,
        "holdings": [
            {
                "symbol": "AAPL",
                "quantity": 87,
                "purchaseTimestampUnix": 1752192000,
                "purchaseDate": "2025-07-11",
                "costBasisPerShare": 212.41,
                "costBasisTotal": 18479.67,
                "currentPrice": 213.88,
                "marketValue": 18607.56,
                "profit": 127.89,
                "returnPercent": 0.69
            },
            {
                "symbol": "MSFT",
                "quantity": 16,
                "purchaseTimestampUnix": 1753315200,
                "purchaseDate": "2025-07-24",
                "costBasisPerShare": 505.87,
                "costBasisTotal": 8093.92,
                "currentPrice": 513.71,
                "marketValue": 8219.36,
                "profit": 125.44,
                "returnPercent": 1.55
            },
            ...
        ]
    }
}
```
