export const migration = {
  id: '025_gym_checkin_sessions',
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gym_class_sessions (
        id SERIAL PRIMARY KEY,
        gym_id INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        sport_type TEXT NOT NULL DEFAULT 'cross',
        title TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ,
        capacity INTEGER,
        location TEXT,
        notes TEXT,
        coach_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'closed', 'canceled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gym_class_checkins (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES gym_class_sessions(id) ON DELETE CASCADE,
        gym_membership_id INTEGER NOT NULL REFERENCES gym_memberships(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'coach_portal', 'athlete_app', 'front_desk', 'qr')),
        status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'checked_in', 'canceled', 'no_show')),
        checked_in_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_class_checkins_unique_membership
        ON gym_class_checkins(session_id, gym_membership_id);

      CREATE INDEX IF NOT EXISTS idx_gym_class_sessions_gym_sport_start
        ON gym_class_sessions(gym_id, sport_type, starts_at DESC);

      CREATE INDEX IF NOT EXISTS idx_gym_class_checkins_session_status
        ON gym_class_checkins(session_id, status, updated_at DESC);

      ALTER TABLE gym_class_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE gym_class_checkins ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS backend_only_deny_all ON gym_class_sessions;
      CREATE POLICY backend_only_deny_all
        ON gym_class_sessions
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);

      DROP POLICY IF EXISTS backend_only_deny_all ON gym_class_checkins;
      CREATE POLICY backend_only_deny_all
        ON gym_class_checkins
        FOR ALL
        TO public
        USING (false)
        WITH CHECK (false);
    `);
  },
};
