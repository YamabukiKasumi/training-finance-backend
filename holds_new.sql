USE finance_data;

-- 如果表已存在，你可能需要先删除它，或者使用 ALTER TABLE 添加新列
-- DROP TABLE IF EXISTS user_stock_holdings;

-- 创建表来存储股票信息和用户持仓 (包含新的买入时间字段)
CREATE TABLE IF NOT EXISTS user_stock_holdings_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,     -- 股票代码，作为唯一标识
    long_name VARCHAR(255),                -- 公司全名
    quote_type VARCHAR(50),                -- 报价类型
    quantity INT NOT NULL DEFAULT 0,       -- 用户持仓数量 (股数)
    currency VARCHAR(10),                  -- 交易货币
    average_analyst_rating VARCHAR(50),    -- 平均分析师评级
    purchase_date DATE,                    -- 买入日期 (YYYY-MM-DD)
    purchase_timestamp_unix BIGINT,        -- 买入时间戳 (Unix timestamp)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 记录最后更新时间
    INDEX idx_symbol (symbol)
);

-- 检查表结构
DESCRIBE user_stock_holdings_new;