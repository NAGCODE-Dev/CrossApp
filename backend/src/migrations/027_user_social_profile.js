export const migration = {
  id: '027_user_social_profile',
  async up(client) {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS display_name TEXT,
        ADD COLUMN IF NOT EXISTS handle TEXT,
        ADD COLUMN IF NOT EXISTS avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'members',
        ADD COLUMN IF NOT EXISTS attendance_display TEXT NOT NULL DEFAULT 'display_name';

      UPDATE users
      SET display_name = COALESCE(display_name, name)
      WHERE display_name IS NULL;

      UPDATE users
      SET profile_visibility = 'members'
      WHERE profile_visibility IS NULL
         OR profile_visibility NOT IN ('public', 'members', 'private');

      UPDATE users
      SET attendance_display = 'display_name'
      WHERE attendance_display IS NULL
         OR attendance_display NOT IN ('display_name', 'first_name', 'anonymous');

      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_profile_visibility_check;

      ALTER TABLE users
        ADD CONSTRAINT users_profile_visibility_check
        CHECK (profile_visibility IN ('public', 'members', 'private'));

      ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_attendance_display_check;

      ALTER TABLE users
        ADD CONSTRAINT users_attendance_display_check
        CHECK (attendance_display IN ('display_name', 'first_name', 'anonymous'));

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle_unique
        ON users (LOWER(handle))
        WHERE handle IS NOT NULL AND handle <> '';
    `);
  },
};
