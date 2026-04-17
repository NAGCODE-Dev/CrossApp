# Rebuild Migration Plan

## Phase 0

- Congelar fronteiras do legado.
- Parar de aumentar acoplamento entre `apps/` e `src/`.
- Usar os testes atuais como baseline de comportamento.

## Phase 1

- Implementar `packages/contracts`.
- Implementar `packages/domain`.
- Subir `apps/api` com auth, billing e athlete snapshots.

## Phase 2

- Subir `apps/coach-web` com:
  - auth
  - billing status
  - gyms
  - memberships
  - groups
  - workouts publish
  - benchmarks
  - leaderboards

## Phase 3

- Subir `apps/athlete-mobile` com:
  - auth
  - imported plan
  - local workout
  - sync snapshots
  - PRs
  - measurements
  - benchmark results
  - timers
  - coach feed

## Phase 4

- Portar running e strength.
- Portar trusted device.
- Portar password reset support.
- Portar Nyx tour.

## Phase 5

- Portar admin/ops.
- Migrar billing claims e workers.
- Migrar account deletion workflow.

## Phase 6

- E2E de equivalencia entre legado e rebuild.
- Rollout controlado por superficie.
- Desligar legado por blocos.

## Definition of done

- Todas as features em `FEATURE_PRESERVATION.md` existem na base nova.
- P95 de boot do atleta reduzido drasticamente.
- Coach web sem layout quebrado.
- API com contratos tipados e testes de integracao.
- Offline do atleta coberto por teste real.
