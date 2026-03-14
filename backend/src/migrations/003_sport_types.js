export const migration = {
  id: '003_sport_types',
  async up(client) {
    await client.query(`
      ALTER TABLE workouts
      ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'cross';

      ALTER TABLE athlete_groups
      ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'cross';

      CREATE INDEX IF NOT EXISTS idx_workouts_gym_sport_date
        ON workouts(gym_id, sport_type, scheduled_date DESC, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_athlete_groups_gym_sport
        ON athlete_groups(gym_id, sport_type, created_at DESC);
    `);
  },
};
