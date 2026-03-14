export const migration = {
  id: '006_log_completion_state',
  async up(client) {
    await client.query(`
      ALTER TABLE running_session_logs
        ADD COLUMN IF NOT EXISTS completion_state TEXT NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS source_label TEXT;

      ALTER TABLE strength_session_logs
        ADD COLUMN IF NOT EXISTS completion_state TEXT NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS source_label TEXT;

      UPDATE running_session_logs
      SET completion_state = CASE WHEN workout_id IS NOT NULL THEN 'completed_from_coach' ELSE 'manual' END,
          source_label = COALESCE(source_label, CASE WHEN workout_id IS NOT NULL THEN title ELSE NULL END)
      WHERE completion_state IS NULL OR completion_state = '';

      UPDATE strength_session_logs
      SET completion_state = CASE WHEN workout_id IS NOT NULL THEN 'completed_from_coach' ELSE 'manual' END,
          source_label = COALESCE(source_label, CASE WHEN workout_id IS NOT NULL THEN exercise ELSE NULL END)
      WHERE completion_state IS NULL OR completion_state = '';
    `);
  },
};
