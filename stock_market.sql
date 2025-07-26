USE finance_data;
CREATE TABLE stock_market (
	id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,			-- 股票代码
    stockType VARCHAR(50) NOT NULL,			-- 股票类型
    lastSalePrice DECIMAL(10,2) ,	-- 最新成交价格，单位通常为美元
    netChange DECIMAL(10,2) ,		-- 相对前一交易日的净变动值
    percentageChange DECIMAL(5,2) ,	-- 相对前一交易日的涨跌幅（百分比）
    deltaIndicator VARCHAR(10) ,	-- 涨跌方向：可为 "up" 或 "down"
    volume BIGINT							-- 当日累计成交量（股数）
);
