export const migration = {
  id: '026_gym_checkin_rules',
  async up(client) {
    await client.query(`
      ALTER TABLE gym_class_sessions
        ADD COLUMN IF NOT EXISTS check_in_closes_at TIMESTAMPTZ;

      ALTER TABLE gym_class_checkins
        ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

      ALTER TABLE gym_class_checkins
        ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

      CREATE INDEX IF NOT EXISTS idx_gym_class_sessions_check_in_closes_at
        ON gym_class_sessions(check_in_closes_at DESC);

      CREATE INDEX IF NOT EXISTS idx_gym_class_checkins_membership_status
        ON gym_class_checkins(gym_membership_id, status, updated_at DESC);
    `);
  },
};
