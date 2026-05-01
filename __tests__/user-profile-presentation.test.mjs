import test from 'node:test';
import assert from 'node:assert/strict';

import { renderAccountProfileSection } from '../apps/athlete/features/account/memberSections.js';
import { getAttendanceDisplayLabel } from '../backend/src/userProfiles.js';

test('getAttendanceDisplayLabel respeita preferência de exibição', () => {
  assert.equal(getAttendanceDisplayLabel({
    display_name: 'Nikolas Alves',
    attendance_display: 'display_name',
  }), 'Nikolas Alves');

  assert.equal(getAttendanceDisplayLabel({
    display_name: 'Nikolas Alves',
    attendance_display: 'first_name',
  }), 'Nikolas');

  assert.equal(getAttendanceDisplayLabel({
    display_name: 'Nikolas Alves',
    attendance_display: 'anonymous',
  }), 'Participante');
});

test('renderAccountProfileSection mostra assinatura, gyms e coaches', () => {
  const html = renderAccountProfileSection(
    ({ content }) => content,
    {
      profile: { email: 'athlete@example.com' },
      planName: 'Athlete Plus',
      planStatus: 'active',
      escapeHtml: (value) => String(value),
      profileCard: {
        displayName: 'Nikolas',
        accountName: 'Nikolas Alves',
        email: 'athlete@example.com',
        handle: 'nikolas',
        avatarUrl: 'https://img.example.com/avatar.png',
        bio: 'Cross e corrida.',
        profileVisibility: 'members',
        attendanceDisplay: 'display_name',
        attendanceLabelPreview: 'Nikolas',
        gyms: [
          {
            gymName: 'Grupo RX',
            role: 'athlete',
            status: 'active',
            warning: null,
            coaches: [
              { displayName: 'Coach Ana' },
              { displayName: 'Coach Leo' },
            ],
          },
        ],
      },
    },
  );

  assert.match(html, /Athlete Plus • active/);
  assert.match(html, /Grupo RX/);
  assert.match(html, /Coach\(es\): Coach Ana, Coach Leo/);
  assert.match(html, /Salvar perfil/);
});
