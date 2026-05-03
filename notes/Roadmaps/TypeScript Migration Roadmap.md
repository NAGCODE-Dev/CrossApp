# TypeScript Migration Roadmap

## Objetivo

Levar as superfícies React novas do Ryxen para `React + TypeScript` sem reescrita brusca e sem quebrar o fluxo local de QA.

## Estado atual

- base de TypeScript instalada
- `athlete-react` preparado com `allowJs`
- `coach-portal` preparado com `allowJs`
- shell React principal do atleta parcialmente migrada

## Fase 1

- [x] instalar TypeScript e tipos React
- [x] criar `tsconfig` compartilhado
- [x] migrar entrypoint do atleta
- [x] migrar componentes principais da shell
- [x] migrar hooks centrais da shell

## Fase 2

- [ ] tipar `services/appShellState`
- [ ] tipar `services/todayViewModel`
- [ ] reduzir casts nas integrações com `packages/ui`
- [ ] reduzir casts nas integrações com `packages/shared-web`

## Fase 3

- [ ] escolher contratos prioritários em `packages/shared-web`
- [ ] extrair tipos compartilhados realmente estáveis
- [ ] revisar se `allowJs` ainda precisa ficar ligado por área

## Fase 4

- [ ] começar migração gradual do `coach-portal`
- [ ] decidir introdução de `React Router`
- [ ] decidir introdução de `TanStack Query`

## Restrições

- não quebrar `npm test`
- não quebrar `npm run test:e2e`
- evitar reescrita grande em áreas estáveis do legado
- manter rollout controlado entre shell nova e fallback legado

## Links

- [[Sessions/2026-05-03 - TypeScript Migration Session]]
- [[QA/Current QA Status]]
- [[Architecture/Current Architecture Snapshot]]
- [[../Home]]
