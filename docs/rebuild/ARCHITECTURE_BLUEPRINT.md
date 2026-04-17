# Rebuild Architecture Blueprint

## Stack

### Monorepo

- `pnpm` workspaces
- `turbo`
- `TypeScript` em tudo

### Athlete

- `Expo`
- `React Native`
- `Expo Router`
- `TanStack Query`
- `Zustand`
- `React Hook Form`
- `Zod`
- `react-native-mmkv`
- `expo-sqlite`

### Coach and marketing web

- `Next.js`
- `React`
- `TanStack Query`
- `React Hook Form`
- `Zod`
- `Tailwind`
- `shadcn/ui` para coach

### Backend

- `Fastify`
- `Postgres`
- `Drizzle ORM`
- `pg-boss`
- `jose`
- `nodemailer`
- `Zod`

## Why this stack

- O atleta vira produto mobile de verdade, nao uma SPA HTML tentando parecer nativa.
- Coach e marketing ficam em web moderna, com roteamento, cache e SSR/ISR quando fizer sentido.
- O backend volta a ser dono dos fluxos criticos: auth, access policy, billing claims, suporte e operacao.
- Contratos tipados evitam regressao silenciosa entre apps e API.
- Outbox local + snapshots em SQLite/MMKV resolvem o caso offline-first do atleta.

## Workspace layout

```text
rebuild/
  apps/
    api/
    athlete-mobile/
    coach-web/
    marketing-web/
  packages/
    contracts/
    domain/
```

## Backend modules

- `auth`
  - signup, signin, refresh, google oauth, trusted device, password reset, support reset
- `athletes`
  - summary, results, measurements, PRs, running, strength, app-state, imported-plan
- `gyms`
  - gyms, memberships, groups, insights
- `workouts`
  - publish, feed, audience targeting
- `benchmarks`
  - library, results, leaderboards
- `billing`
  - status, entitlements, checkout link orchestration, kiwify claims, reversals
- `admin`
  - overview, ops health, claim reprocess, email retry, account deletion
- `telemetry`
  - ingest, consent-aware client contracts
- `jobs`
  - email, retention, claim reconciliation, account deletion

## Data ownership

- `apps/athlete-mobile`
  - dono de UX, offline cache, import, timers e sync do atleta
- `apps/coach-web`
  - dono de operacao do coach
- `apps/marketing-web`
  - dono da landing, pricing e paginas institucionais
- `apps/api`
  - dono de regras de acesso, sessao, billing, workflows operacionais e dados
- `packages/contracts`
  - schemas compartilhados entre clientes e API
- `packages/domain`
  - regras puras de negocio sem UI e sem IO

## State strategy

### Athlete

- `TanStack Query` para server state
- `Zustand` para UI state efemero
- `SQLite/MMKV` para persistencia local
- `Outbox` para sync eventual

### Coach web

- `TanStack Query` para server state
- `React Hook Form` para workflows de formulario
- `Local draft storage` so para rascunhos operacionais

## Rendering strategy

- Zero `innerHTML`.
- Zero diff manual por string.
- UI declarativa em componentes.
- Navegacao real por rotas.
- Suspense/loading states tipados por superficie.

## Import pipeline

- Parser e normalizacao saem da UI e entram em `packages/domain`.
- Processamento pesado fica assicrono e isolado.
- No mobile, OCR/video parsing roda fora da thread critica sempre que possivel.
- Cada formato produz o mesmo contrato de `ImportedPlanDraft`.

## Access policy

- Access policy vira dominio puro testado.
- UI nao decide entitlement.
- Backend responde snapshots prontos por superficie:
  - `athlete-access-snapshot`
  - `coach-access-snapshot`

## Migration rules

- A reescrita nasce em paralelo ao legado.
- Nenhuma funcionalidade sai do legado antes de existir na nova base.
- Testes do legado viram referencia funcional da nova implementacao.
- A API nova comeca como `strangler` do backend atual:
  - mesma base Postgres
  - compatibilidade com o mesmo JWT `HS256`
  - contratos tipados novos por cima da semantica real existente

## Current migrated slices

- `auth`
  - `GET /auth/me`
  - `POST /auth/refresh`
  - `POST /auth/signout`
- `billing`
  - `GET /billing/status`
  - `GET /billing/entitlements`
  - `POST /billing/checkout`
  - `POST /billing/mock/activate`
- `athletes`
  - `GET|PUT /athletes/me/app-state`
  - `GET|PUT|DELETE /athletes/me/imported-plan`
  - `GET /athletes/me/measurements/history`
  - `POST /athletes/me/measurements/snapshot`
  - `POST /athletes/me/prs/snapshot`
