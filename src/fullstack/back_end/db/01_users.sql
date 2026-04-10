-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id        BIGSERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'user',
    status         VARCHAR(20) NOT NULL DEFAULT 'active',
    phone          VARCHAR(20) UNIQUE,
    plan           VARCHAR(20) NOT NULL DEFAULT 'free',
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login     TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_plan ON users(plan);

-- User Session table
CREATE TABLE IF NOT EXISTS user_session (
    session_id     SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    oauth_provider VARCHAR(100),
    time_elapsed   INTEGER,
    access_token   TEXT,
    refresh_token  TEXT,
    expires_at     TIMESTAMP
);

-- Watch List table
CREATE TABLE IF NOT EXISTS watch_list (
    watchlist_id   SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    market_id      VARCHAR(255),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Profile table
CREATE TABLE IF NOT EXISTS user_profile (
    profile_id       SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    first_name       VARCHAR(100),
    last_name        VARCHAR(100),
    watchlist_id     INTEGER REFERENCES watch_list(watchlist_id) ON DELETE SET NULL,
    bio              TEXT,
    preferences_json JSONB
);

-- MFA codes table (for SMS verification)
CREATE TABLE IF NOT EXISTS mfa_code (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    code           VARCHAR(6) NOT NULL,
    expires_at     TIMESTAMP NOT NULL,
    used           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_resets (
    reset_id       BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    reset_token    TEXT NOT NULL UNIQUE,
    expires_at     TIMESTAMP NOT NULL,
    used           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reset_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(reset_token);
