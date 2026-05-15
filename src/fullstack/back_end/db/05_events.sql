-- System Events / Transactions Log
CREATE TABLE IF NOT EXISTS system_events (
    event_id       BIGSERIAL PRIMARY KEY,
    event_type     VARCHAR(50) NOT NULL,
    user_id        BIGINT,
    amount         NUMERIC(12,2),
    status         VARCHAR(20),
    description    TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_event_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_events_user_id ON system_events(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_time ON system_events(created_at);
