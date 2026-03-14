export const migration = {
  id: '004_competition_sport_types',
  async up(client) {
    await client.query(`
      ALTER TABLE competitions
      ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'cross';

      ALTER TABLE competition_events
      ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'cross';

      ALTER TABLE benchmark_results
      ADD COLUMN IF NOT EXISTS sport_type TEXT NOT NULL DEFAULT 'cross';

      CREATE INDEX IF NOT EXISTS idx_competitions_gym_sport_starts
        ON competitions(gym_id, sport_type, starts_at DESC);

      CREATE INDEX IF NOT EXISTS idx_competition_events_comp_sport_date
        ON competition_events(competition_id, sport_type, event_date DESC);

      CREATE INDEX IF NOT EXISTS idx_benchmark_results_sport_slug
        ON benchmark_results(sport_type, benchmark_slug, created_at DESC);
    `);
  },
};
