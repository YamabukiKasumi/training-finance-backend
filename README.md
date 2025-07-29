# training-finance-backend

**stock_quote.js** Fetch a specified stock information.

**test.js** Fetch several information using domestic apis.

**recent.js** Fetch the history of a specified stock and save to database.

~~**information_to_db.js(deprecated)** Fetch the information of holding stocks and save them to database.~~

**information_to_db_new.js** Fetch the information of holding stocks and save them to database.

**calculate_portfolio_value.js** Calculate the total value in real time.

**save_latest_news.js** Fetch the latest news about stock/ETF and save to DB.

**stock_market.js** Fetch the realtime quote date and save to DB for the optional function.

**utils/response.js** Define the format of the response.

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
```
{
    "code": 200,
    "message": "成功",
    "data": [
        {
            "symbol": "^GSPC",
            "name": "S&P 500",
            "price": 6388.64,
            "changePercentage": 0.3974
        },
        {
            "symbol": "^DJI",
            "name": "Dow Jones Industrial Average",
            "price": 44901.92,
            "changePercentage": 0.4654
        },
        {
            "symbol": "^IXIC",
            "name": "NASDAQ Composite",
            "price": 21108.32,
            "changePercentage": 0.2391
        },
        {
            "symbol": "^RUT",
            "name": "Russell 2000",
            "price": 2261.07,
            "changePercentage": 0.3967
        },
        {
            "symbol": "^FTSE",
            "name": "FTSE 100",
            "price": 9120.31,
            "changePercentage": -0.1976
        },
        {
            "symbol": "^N225",
            "name": "Nikkei 225",
            "price": 41076.25,
            "changePercentage": -0.9166
        },
        {
            "symbol": "^HSI",
            "name": "Hang Seng Index",
            "price": 25530.93,
            "changePercentage": 0.5616
        }
    ]
}
```
ratingService.js
```
{"code":200,"message":"成功","data":{"averageDiscountedCashFlowScore":3,"averageReturnOnAssetsScore":4.71,"averageDebtToEquityScore":2.71,"averagePriceToEarningsScore":1.71,"averagePriceToBookScore":1}}
```

dailuPerformanceService.js
```
{
    "code": 200,
    "message": "成功",
    "data": [
        {
            "date": "2025-06-29",
            "totalAssets": 263635.43,
            "dailyProfitLoss": 0,
            "dailyReturnPercentage": 0,
            "benchmarkReturnPercentage": 0
        },
        {
            "date": "2025-06-30",
            "totalAssets": 264733.61,
            "dailyProfitLoss": 1098.18,
            "dailyReturnPercentage": 0.42,
            "benchmarkReturnPercentage": 0.0761
        },
        ...
    ]
}
```
