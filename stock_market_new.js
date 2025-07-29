USE finance_data;
CREATE TABLE stock_market_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL UNIQUE,  -- ✅ 添加 UNIQUE 约束
  stockType VARCHAR(50),
  lastSalePrice DECIMAL(10,2),
  netChange DECIMAL(10,2),
  percentageChange DECIMAL(5,2),
  deltaIndicator VARCHAR(10),
  volume BIGINT
);
