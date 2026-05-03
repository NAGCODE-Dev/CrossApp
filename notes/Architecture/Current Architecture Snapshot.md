# Current Architecture Snapshot

## Em uma frase

Ryxen é uma plataforma com superfícies separadas para atleta e coach, backend Node/Express/Postgres e uma migração progressiva para React + TypeScript nas superfícies novas.

## Superfícies

- brand surface
  - landing pública
  - hub de entrada
- app surface
  - atleta
  - coach
  - app nativo com Capacitor

## Stack hoje

- frontend legado: JS modular
- frontend novo: Vite + React
- CSS: Tailwind como infraestrutura em áreas novas
- backend: Node + Express + Postgres
- QA: Node test, Vitest e Playwright

## Direção alvo

- `landing/hub`: React + TypeScript + CSS próprio
- `athlete app`: React + TypeScript
- `coach portal`: React + TypeScript
- backend futuro mais modular

## Links

- [[../Roadmaps/TypeScript Migration Roadmap]]
- [[../Product/Product Surface Map]]
- [Architecture Target](../../docs/ARCHITECTURE_TARGET.md)
- [[../Home]]
