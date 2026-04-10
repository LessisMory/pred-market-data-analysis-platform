-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id    SERIAL PRIMARY KEY,
    role_name  VARCHAR(50) UNIQUE NOT NULL
);

-- User Roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id    BIGINT,
    role_id    INT,
    PRIMARY KEY (user_id, role_id),

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);
