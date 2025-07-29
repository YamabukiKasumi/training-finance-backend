USE finance_data;

-- 创建表来存储股票信息和用户持仓
CREATE TABLE IF NOT EXISTS user_stock_holdings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,  -- 股票代码，作为唯一标识
    long_name VARCHAR(255),             -- 公司全名
    quote_type VARCHAR(50),             -- 报价类型
    quantity INT NOT NULL DEFAULT 0,    -- 用户持仓数量 (股数)
    currency VARCHAR(10),               -- 交易货币
    average_analyst_rating VARCHAR(50), -- 平均分析师评级
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 记录最后更新时间
    INDEX idx_symbol (symbol)
);

-- 检查表结构
DESCRIBE user_stock_holdings;

-- (可选) 插入一些示例持仓数据，以便测试
-- INSERT INTO user_stock_holdings (symbol, quantity) VALUES ('AAPL', 10), ('MSFT', 5), ('GOOGL', 20);