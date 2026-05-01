import test from 'node:test';
import assert from 'node:assert/strict';

import { renderAccountCheckinSection } from '../apps/athlete/features/account/memberSections.js';
import { serializeAthleteVisibleCheckinSession } from '../backend/src/routes/athleteRoutes.js';

test('serializeAthleteVisibleCheckinSession expõe apenas presença segura para o atleta', () => {
  const session = {
    id: 41,
    title: 'Cross 15:30',
    entries: [
      {
        id: 1,
        userId: 12,
        attendeeLabel: 'Nikolas',
        attendeeEmail: 'nikolas@example.com',
        gymMembershipId: 91,
        status: 'reserved',
      },
      {
        id: 2,
        userId: 18,
        attendeeLabel: 'Maria',
        attendeeEmail: 'maria@example.com',
        gymMembershipId: 92,
        status: 'checked_in',
      },
      {
        id: 3,
        userId: 27,
        attendeeLabel: 'Pedro',
        attendeeEmail: 'pedro@example.com',
        gymMembershipId: 93,
        status: 'canceled',
      },
    ],
  };

  const visible = serializeAthleteVisibleCheckinSession(session, 12);

  assert.equal(visible.viewerStatus, 'reserved');
  assert.equal(visible.entries.length, 2);
  assert.deepEqual(visible.entries[0], {
    displayName: 'Nikolas',
    status: 'reserved',
    isSelf: true,
  });
  assert.deepEqual(visible.entries[1], {
    displayName: 'Maria',
    status: 'checked_in',
    isSelf: false,
  });
  assert.equal('attendeeEmail' in visible.entries[0], false);
  assert.equal('gymMembershipId' in visible.entries[0], false);
  assert.equal('userId' in visible.entries[0], false);
});

test('renderAccountCheckinSection mostra quem vai sem expor email', () => {
  const html = renderAccountCheckinSection(
    ({ content }) => content,
    {
      selectedGym: { name: 'Grupo RX' },
      selectedGymId: 8,
      isCheckinsLoading: false,
      escapeHtml: (value) => String(value),
      checkinSessions: [
        {
          id: 10,
          title: 'Cross 15:30',
          starts_at: '2026-04-30T15:30:00.000Z',
          location: 'Sala 1',
          viewerStatus: 'reserved',
          entries: [
            { displayName: 'Nikolas', status: 'reserved', isSelf: true },
            { displayName: 'Maria', status: 'checked_in', isSelf: false },
          ],
          rules: {
            checkInClosed: false,
            checkInClosesAt: '2026-04-30T15:20:00.000Z',
          },
          summary: {
            totalEntries: 2,
            availableSpots: 8,
            canceledCount: 0,
          },
          capacity: 10,
        },
      ],
    },
  );

  assert.match(html, /Nikolas/);
  assert.match(html, /Maria/);
  assert.match(html, /Você está confirmado nesta aula/);
  assert.doesNotMatch(html, /@example\.com/);
});
