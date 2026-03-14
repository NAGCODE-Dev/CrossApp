export const migration = {
  id: '005_sport_history',
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS running_session_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
        title TEXT,
        session_type TEXT,
        distance_km NUMERIC,
        duration_min NUMERIC,
        avg_pace TEXT,
        target_pace TEXT,
        zone TEXT,
        notes TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS strength_session_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
        exercise TEXT NOT NULL,
        sets_count INTEGER,
        reps_text TEXT,
        load_value NUMERIC,
        load_text TEXT,
        rir NUMERIC,
        notes TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_running_session_logs_user_logged_at
        ON running_session_logs(user_id, logged_at DESC);

      CREATE INDEX IF NOT EXISTS idx_strength_session_logs_user_exercise
        ON strength_session_logs(user_id, exercise, logged_at DESC);

      ALTER TABLE running_session_logs
        ADD COLUMN IF NOT EXISTS workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL;

      ALTER TABLE strength_session_logs
        ADD COLUMN IF NOT EXISTS workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_running_session_logs_workout
        ON running_session_logs(workout_id);

      CREATE INDEX IF NOT EXISTS idx_strength_session_logs_workout
        ON strength_session_logs(workout_id);
    `);
  },
};
