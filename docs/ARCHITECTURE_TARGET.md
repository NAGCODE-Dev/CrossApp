# Ryxen Architecture Target

## Direção principal

O Ryxen deve evoluir para uma plataforma com duas categorias claras de superfície:

- `brand surface`
  - landing pública
  - hub de entrada
  - páginas institucionais
- `app surface`
  - atleta
  - coach
  - mobile instalado com Capacitor

A escolha de stack parte disso:

- `landing/hub`: React + TypeScript + CSS próprio
- `athlete app`: React + TypeScript + React Router + TanStack Query + React Hook Form + Zod
- `coach portal`: React + TypeScript + TanStack Query + React Hook Form + Zod + shadcn/ui
- `mobile`: Capacitor
- `backend`: Fastify + Postgres, com Supabase Auth/Storage quando a prioridade for velocidade

## Stack recomendado

### Frontend

- `Vite`
- `React`
- `TypeScript`
- `Capacitor`
- `TanStack Query`
- `React Hook Form`
- `Zod`

### UI

- `landing/hub`: CSS próprio refinado
- `athlete/coach`: Tailwind como infraestrutura
- `coach portal`: `shadcn/ui` nas superfícies internas de gestão

### Backend

- `Fastify`
- `Postgres`
- `Supabase Auth`
- `Supabase Storage`

### Observabilidade e testes

- `Playwright`
- `Sentry`
- `Vercel Analytics`
- `Vercel Speed Insights`
- `Vitest` como alvo futuro para a camada React/TS

## Estrutura de pastas ideal

```text
apps/
  landing/
    src/
      app/
      components/
      sections/
      styles/
      routes/
  hub/
    src/
      app/
      components/
      sections/
      styles/
      routes/
  athlete/
    src/
      app/
      routes/
      features/
        today/
        history/
        account/
        import/
        prs/
        measurements/
        billing/
      components/
      forms/
      hooks/
      state/
      styles/
  coach/
    src/
      app/
      routes/
      features/
        dashboard/
        gyms/
        memberships/
        groups/
        workouts/
        benchmarks/
        leaderboards/
        billing/
      components/
      forms/
      hooks/
      styles/

packages/
  shared-web/
    runtime/
    auth/
    api/
    bridge/
  shared-ui/
    primitives/
    feedback/
    forms/
    layout/
    charts/
    tokens/
  shared-contracts/
    auth/
    athlete/
    coach/
    billing/
    leaderboards/
    schemas/

backend/
  src/
    app/
    plugins/
    routes/
    queries/
    services/
    contracts/
    auth/
    billing/
    storage/
    db/
    utils/
```

## Mapeamento do estado atual

Hoje o projeto já tem uma boa pré-base para essa migração:

- `apps/hub`
- `apps/athlete`
- `coach-portal`
- `packages/shared-web`
- `backend/src/queries`
- `backend/src/services`

O que ainda está no meio do caminho:

- `src/hub` ainda carrega landing/hub em JS imperativo
- `src/ui` ainda segura muito da camada visual do atleta
- `coach-portal` ainda é React sem TypeScript
- `packages/shared-ui` e `packages/shared-contracts` ainda não existem
- `backend` ainda está mais próximo de Express-style modular do que de Fastify modular

## Princípios de decisão

1. Não forçar a mesma solução visual para `brand surface` e `app surface`.
2. Unificar a camada de UI em React + TypeScript antes de qualquer reescrita de backend.
3. Priorizar contratos compartilhados e estado previsível antes de branding pesado.
4. Manter `Capacitor` como camada nativa, mas não deixar regras de runtime espalhadas na UI.
5. Tratar `coach` e `athlete` como produtos diferentes compartilhando só o que realmente é comum.

## Critérios de decisão: landing vs hub

`landing` e `hub` compartilham marca e entrada, mas não têm a mesma função.

### `landing`

Use `landing` quando a prioridade for:

- apresentar a marca
- vender clareza de proposta
- explicar valor
- conduzir o usuário para um papel
- trabalhar SEO, share e primeira impressão

O `landing` não deve absorver regras internas de produto, estados complexos nem UI operacional.

### `hub`

Use `hub` quando a prioridade for:

- encaminhar o usuário para a superfície correta
- concentrar entry flows
- servir como ponto de entrada entre modalidades e papéis
- carregar estados simples de sessão e navegação inicial

O `hub` não deve tentar virar landing de marketing nem dashboard interno ao mesmo tempo.

### Regra prática

Se a pergunta principal da tela for:

- "por que esse produto existe?" -> `landing`
- "por onde eu entro?" -> `hub`
- "como eu treino/opero?" -> `athlete` ou `coach`

## Limite inicial do `shared-ui`

O `shared-ui` deve nascer pequeno. A meta inicial é evitar duplicação entre superfícies internas, não centralizar tudo cedo demais.

### Entra primeiro

- tokens de cor, tipografia, radius, spacing e elevação
- `Button`
- `Badge`
- `Input`
- `Select` simples
- `Dialog` shell
- `Sheet` shell
- `EmptyState`
- `SectionHeader`
- estados de loading, status e feedback

### Fica fora no começo

- hero blocks da landing
- componentes de marketing
- cards editoriais
- charts específicos
- componentes acoplados ao domínio
- qualquer bloco que exista só para uma tela

### Regra prática

Se um componente puder viver igual em `athlete` e `coach` sem copy de marca nem regra de negócio, ele é candidato a `shared-ui`.

Se ele carrega narrativa, fluxo de venda ou lógica de treino/operação, ele fica fora.

## `athlete` como superfície própria

O `athlete` deve ser tratado como produto, não como extensão do hub nem variação do coach.

### Responsabilidades do `athlete`

- treino do dia
- histórico
- PRs
- medidas
- importação
- sync local/remoto
- preferências
- billing e acesso do ponto de vista do atleta

### O que não pertence ao `athlete`

- marketing da marca
- navegação de entrada entre papéis
- operação de box
- publishing e administração de coach

### Fronteira interna recomendada

Dentro de `apps/athlete`, a divisão alvo é:

- `routes/`
- `features/today`
- `features/history`
- `features/account`
- `features/import`
- `features/prs`
- `features/measurements`
- `features/billing`
- `components/`
- `hooks/`
- `state/`
- `services/`

### Regra prática

Qualquer código que exista para ajudar o atleta a treinar, acompanhar evolução ou manter a própria conta deve migrar para `apps/athlete`, mesmo que hoje ainda esteja em `src/app` ou `src/ui`.

## Ordem de migração recomendada

### Fase 1. Unificação de frontend

- adicionar `TypeScript`
- mover `hub` para React
- mover o `athlete app` para React por rotas/features
- manter `coach portal` em React e migrar para TypeScript

### Fase 2. Estado, formulários e contratos

- introduzir `TanStack Query`
- introduzir `React Hook Form`
- introduzir `Zod`
- criar `packages/shared-contracts`

### Fase 3. Shared UI

- criar `packages/shared-ui`
- separar primitives, forms, feedback e layout
- usar `shadcn/ui` primeiro no coach
- manter a landing fora dessa dependência

### Fase 4. Backend

- migrar para `Fastify`
- consolidar `queries` e `write services`
- alinhar contratos com `shared-contracts`
- manter `Postgres`
- usar `Supabase Auth/Storage` se a prioridade continuar sendo velocidade

## Decisão visual

### Onde usar CSS próprio

- landing
- hub público
- páginas institucionais

### Onde usar Tailwind-first

- athlete
- coach
- componentes compartilhados internos

### Onde usar shadcn/ui

- coach portal
- superfícies administrativas e operacionais
- tabelas, dialogs, sheets, tabs, filters, status e forms

## Próximo melhor passo

O melhor próximo passo arquitetural é:

1. manter `landing` e `hub` separados por objetivo
2. criar o limite inicial de `packages/shared-ui`
3. consolidar `athlete` como superfície própria por features
4. depois adicionar `TypeScript`
5. então levar o `athlete` para `React + Router + Query`

Esse é o ponto que mais aumenta consistência sem tentar reescrever tudo ao mesmo tempo.
