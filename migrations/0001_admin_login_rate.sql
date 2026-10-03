CREATE TABLE IF NOT EXISTS admin_login_rate (
    client_key TEXT PRIMARY KEY NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_started_at INTEGER NOT NULL DEFAULT 0,
    blocked_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_admin_login_rate_updated_at
    ON admin_login_rate(updated_at);
