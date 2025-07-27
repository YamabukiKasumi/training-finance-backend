USE finance_data;
CREATE TABLE IF NOT EXISTS latest_news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(30) NOT NULL,            -- 股票 symbol，如 'AAPL'
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    img TEXT,
    summary TEXT,
    source VARCHAR(100),
    type VARCHAR(50),                       -- 新闻类型，如 Article、VIDEO
    published_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_symbol (symbol)       -- 每只股票只保留一条新闻（最新）
);
