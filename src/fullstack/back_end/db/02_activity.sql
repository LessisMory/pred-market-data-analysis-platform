-- User Activity table (event-level tracking)
CREATE TABLE IF NOT EXISTS user_activity (
    activity_id    BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    activity_type  VARCHAR(50) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_activity_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_time ON user_activity(created_at);

-- User Stats table (aggregated)
CREATE TABLE IF NOT EXISTS user_stats (
    user_id        BIGINT PRIMARY KEY,
    total_trades   INT DEFAULT 0,
    total_volume   DOUBLE PRECISION DEFAULT 0,
    last_active    TIMESTAMP,

    CONSTRAINT fk_user_stats_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);
