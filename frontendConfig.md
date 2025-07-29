可以通过postman或Thunder Client插件进行测试

自选模块：
url：POST http://localhost:3000/api/stocks/news
Headers：
    Content-Type: application/json
Body：
    {
        "symbols": ["AAPL", "TSLA"]
    }
    
PS：请求的股票代码symbol需要在数据库中存在



