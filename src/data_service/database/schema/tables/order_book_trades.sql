CREATE TABLE IF NOT EXISTS order_book_trades (
    id BIGSERIAL PRIMARY KEY,
    market_id TEXT NOT NULL,
    token_id TEXT NOT NULL REFERENCES tokens(token_id),
    price DOUBLE PRECISION NOT NULL,
    size DOUBLE PRECISION NOT NULL,
    fee_rate_bps INTEGER,
    side TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    trade_timestamp TIMESTAMPTZ(3) NOT NULL
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_order_book_trades_transaction_hash
ON order_book_trades (transaction_hash);
