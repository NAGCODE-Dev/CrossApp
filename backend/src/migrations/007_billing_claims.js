export const migration = {
  id: '007_billing_claims',
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_claims (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        external_ref TEXT NOT NULL,
        email TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        renew_days INTEGER NOT NULL DEFAULT 30,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'ignored')),
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        applied_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        applied_subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
        renew_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_claims_provider_ref_unique
        ON billing_claims(provider, external_ref);

      CREATE INDEX IF NOT EXISTS idx_billing_claims_email_status
        ON billing_claims(email, status, created_at DESC);
    `);
  },
};
