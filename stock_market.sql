USE finance_data;
CREATE TABLE stock_market (
    symbol VARCHAR(10),
    stockType VARCHAR(50),
    lastSalePrice DECIMAL(10,2),
    netChange DECIMAL(10,2),
    percentageChange DECIMAL(5,2),
    deltaIndicator VARCHAR(10),
    volume BIGINT
);
