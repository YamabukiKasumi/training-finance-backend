USE finance_data;

CREATE TABLE IF NOT EXISTS stock_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    -- timestamp 字段存储 'YYYY-MM-DD' 格式的字符串
    data_timestamp DATE NOT NULL, 
    -- timestamp_unix 字段存储 Unix 时间戳
    data_timestamp_unix BIGINT NOT NULL, 
    open_price DECIMAL(10, 4) NOT NULL,
    high_price DECIMAL(10, 4) NOT NULL,
    low_price DECIMAL(10, 4) NOT NULL,
    close_price DECIMAL(10, 4) NOT NULL,
    volume BIGINT NOT NULL,
    
    -- 可选：添加唯一约束，防止重复插入同一时间点的数据
    UNIQUE KEY unique_symbol_time (symbol, data_timestamp_unix),
    -- 可选：添加索引以提高查询速度
    INDEX idx_symbol (symbol),
    INDEX idx_timestamp_unix (data_timestamp_unix)
);

-- 检查表结构
DESCRIBE stock_history;