-- Admin Action Log (audit trail)
CREATE TABLE IF NOT EXISTS admin_actions (
    action_id        BIGSERIAL PRIMARY KEY,
    admin_id         BIGINT NOT NULL,
    target_user_id   BIGINT,
    action_type      VARCHAR(50) NOT NULL,
    metadata         JSONB,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_admin_actor
        FOREIGN KEY (admin_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_admin_target
        FOREIGN KEY (target_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions(created_at);
