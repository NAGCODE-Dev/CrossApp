export const PROFILE_VISIBILITY_OPTIONS = ['public', 'members', 'private'];
export const ATTENDANCE_DISPLAY_OPTIONS = ['display_name', 'first_name', 'anonymous'];

export function buildSafeUserSelect(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return [
    `${prefix}id`,
    `${prefix}email`,
    `${prefix}name`,
    `${prefix}display_name`,
    `${prefix}handle`,
    `${prefix}avatar_url`,
    `${prefix}bio`,
    `${prefix}profile_visibility`,
    `${prefix}attendance_display`,
    `${prefix}is_admin`,
    `${prefix}email_verified`,
    `${prefix}email_verified_at`,
    `${prefix}session_version`,
  ].join(', ');
}

function normalizeNullableText(value, maxLength = 160) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeHandle(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/^@+/, '');
  if (!normalized) return null;
  if (!/^[a-z0-9._-]{3,30}$/.test(normalized)) {
    const error = new Error('Handle inválido. Use 3-30 caracteres com letras, números, ponto, hífen ou underscore.');
    error.code = 'invalid_handle';
    throw error;
  }
  return normalized;
}

function normalizeAvatarUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (normalized.length > 500) {
    const error = new Error('URL da foto muito longa');
    error.code = 'invalid_avatar_url';
    throw error;
  }
  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid_protocol');
    }
    return parsed.toString();
  } catch {
    const error = new Error('URL da foto inválida');
    error.code = 'invalid_avatar_url';
    throw error;
  }
}

function normalizeChoice(value, allowed = [], fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (allowed.includes(normalized)) return normalized;
  return fallback;
}

export function normalizeProfileUpdateInput(input = {}) {
  return {
    name: normalizeNullableText(input?.name, 120),
    displayName: normalizeNullableText(input?.displayName, 120),
    handle: normalizeHandle(input?.handle),
    avatarUrl: normalizeAvatarUrl(input?.avatarUrl),
    bio: normalizeNullableText(input?.bio, 280),
    profileVisibility: normalizeChoice(input?.profileVisibility, PROFILE_VISIBILITY_OPTIONS, 'members'),
    attendanceDisplay: normalizeChoice(input?.attendanceDisplay, ATTENDANCE_DISPLAY_OPTIONS, 'display_name'),
  };
}

export function getUserDisplayName(user = {}) {
  return String(
    user?.display_name
    || user?.displayName
    || user?.name
    || user?.email
    || 'Atleta',
  ).trim() || 'Atleta';
}

export function getAttendanceDisplayLabel(user = {}, fallbackLabel = 'Atleta') {
  const baseLabel = String(
    user?.display_name
    || user?.displayName
    || user?.name
    || user?.attendeeDisplayName
    || user?.attendeeName
    || user?.attendeeLabel
    || fallbackLabel,
  ).trim() || fallbackLabel;
  const mode = String(
    user?.attendance_display
    || user?.attendanceDisplay
    || user?.attendeeAttendanceDisplay
    || 'display_name',
  ).trim().toLowerCase();

  if (mode === 'anonymous') return 'Participante';
  if (mode === 'first_name') {
    const [firstName] = baseLabel.split(/\s+/).filter(Boolean);
    return firstName || fallbackLabel;
  }
  return baseLabel;
}
