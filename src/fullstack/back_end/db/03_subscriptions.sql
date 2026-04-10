-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    sub_id         BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    plan           VARCHAR(20) NOT NULL,
    start_date     TIMESTAMP NOT NULL,
    end_date       TIMESTAMP,
    status         VARCHAR(20) NOT NULL,

    CONSTRAINT fk_sub_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_sub_user_id ON subscriptions(user_id);
CREATE INDEX idx_sub_status ON subscriptions(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id     BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    amount         NUMERIC(12,2) NOT NULL,
    currency       VARCHAR(10) DEFAULT 'USD',
    status         VARCHAR(20) NOT NULL,
    payment_type   VARCHAR(20),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_time ON payments(created_at);
