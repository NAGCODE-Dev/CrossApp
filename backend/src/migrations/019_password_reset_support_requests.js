export const migration = {
  id: '019_password_reset_support_requests',
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_support_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        denied_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        request_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed', 'expired')),
        source TEXT NOT NULL DEFAULT 'email_delivery_failed',
        last_error TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        expires_at TIMESTAMPTZ NOT NULL,
        approved_at TIMESTAMPTZ,
        denied_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_support_requests_request_key
        ON password_reset_support_requests(request_key);

      CREATE INDEX IF NOT EXISTS idx_password_reset_support_requests_status_created
        ON password_reset_support_requests(status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_password_reset_support_requests_user_created
        ON password_reset_support_requests(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_password_reset_support_requests_email_created
        ON password_reset_support_requests(email, created_at DESC);
    `);
  },
};
