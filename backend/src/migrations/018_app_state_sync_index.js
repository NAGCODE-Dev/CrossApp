export const migration = {
  id: '018_app_state_sync_index',
  async up(client) {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_snapshots_user_app_kind_created
        ON sync_snapshots(user_id, created_at DESC)
        WHERE COALESCE(payload->>'kind', '') IN ('imported_plan', 'app_state');
    `);
  },
};
