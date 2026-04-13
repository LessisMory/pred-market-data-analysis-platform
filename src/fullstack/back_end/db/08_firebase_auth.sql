ALTER TABLE users
ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
