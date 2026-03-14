# CrossApp Backend

Backend Node + Postgres para:
- autenticação
- billing (Kiwify link no frontend + mock local de desenvolvimento)
- sync entre dispositivos
- telemetria
- reset de senha por código
- painel admin básico
- gyms, memberships e feed de treinos
- benchmark library

## Rodar com Docker (recomendado)

No diretório raiz do projeto:

```bash
docker compose up -d
```

Frontend: `http://localhost:8000`  
API via nginx: `http://localhost:8000/api`  
Backend direto: `http://localhost:8787`  
Postgres: `localhost:5432`

## Rodar local sem Docker

```bash
cd backend
cp .env.example .env
npm install
npm run start
```

## Configuração no frontend

Com Docker, nenhuma configuração manual é necessária. O frontend usa `/api` por padrão e o nginx faz proxy para o backend.

Se você quiser apontar para outro backend, use no console do app:

```js
__APP__.setRuntimeConfig({
  apiBaseUrl: 'https://sua-api.example.com',
  billing: {
    provider: 'kiwify_link'
  }
})
```

## Teste rápido de assinatura (modo mock)

1. Fazer signup/signin.
2. `POST /billing/mock/activate` existe apenas para a conta de desenvolvimento (`nagcode.contact@gmail.com`).
3. Consultar `GET /billing/status`.

## Reset de senha

- `POST /auth/request-password-reset`
- `POST /auth/confirm-password-reset`

Se SMTP não estiver configurado, o backend usa Ethereal para preview de email. O preview/código só é exposto para a conta de desenvolvimento e apenas quando `EXPOSE_RESET_CODE=true`.

## Admin

- O primeiro usuário criado vira admin automaticamente.
- Emails listados em `ADMIN_EMAILS` também viram admin.
- Endpoint: `GET /admin/overview`

## Gyms / Coach / Athlete

Endpoints principais:

- `POST /gyms`
- `GET /gyms/me`
- `POST /gyms/:gymId/memberships`
- `GET /gyms/:gymId/memberships`
- `POST /gyms/:gymId/workouts`
- `GET /workouts/feed`
- `GET /access/context`
- `GET /benchmarks`
- `GET /competitions/calendar`
- `POST /gyms/:gymId/competitions`
- `POST /competitions/:competitionId/events`
- `POST /benchmarks/:slug/results`
- `GET /leaderboards/benchmarks/:slug`
- `GET /leaderboards/events/:eventId`
- `GET /leaderboards/competitions/:competitionId`

Parâmetros úteis em `GET /benchmarks`:

- `q`
- `category`
- `source`
- `sort` com `year_desc`, `year_asc`, `name_asc`, `name_desc`, `category_asc`
- `page`
- `limit`

Regra de acesso:

- o coach/owner precisa ter assinatura ativa para publicar treinos
- atletas só recebem feed quando a assinatura do coach permite uso do app
- após vencimento, a assinatura entra em janela de grace antes do bloqueio total

Frontend dedicado:

- Coach Portal: `http://localhost:8000/coach/`

Deploy recomendado:

- frontend no Vercel
- backend no Render
- banco no Supabase
- alternativa depois: Railway

Arquivos:

- `../render.yaml`
- `../docs/deploy/VERCEL_RENDER_SUPABASE.md`
- `.env.render.example`
- detalhes em `docs/deploy/VERCEL_RAILWAY.md`

Seeds:

- biblioteca organizada em `backend/src/benchmarks/girls.js`
- `backend/src/benchmarks/hero.js`
- `backend/src/benchmarks/open.js`

## Billing atual

- checkout externo por link da Kiwify no frontend
- backend mantém:
  - `GET /billing/status`
  - `GET /billing/entitlements`
  - `POST /billing/mock/activate` para desenvolvimento
