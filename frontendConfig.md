可以通过postman或Thunder Client插件进行测试

新闻模块：
url：GET http://localhost:3000/api/stocks/news
Headers：
    symbols: AAPL, SPY
    
PS：请求的股票代码symbol需要在数据库中存在



自选模块：
url: POST http://localhost:3001/api/stocks/market
Body: json格式
    [
        { "ticker": "AAPL", "type": "Common Stock" },
        { "ticker": "SPY", "type": "ETF" },
        { "ticker": "VFIAX", "type": "Managed Fund" }
    ]
PS：在前端需要同时传递“股票+类型”两个参数，其中类型type字段有三个值分别为：Common Stock，ETF，Managed Fund
//test
