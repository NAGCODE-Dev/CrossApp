# Ryxen Rebuild

Workspace paralela para reescrever o produto com arquitetura moderna,
preservando comportamento do legado.

## Apps

- `apps/api`: backend Fastify + Postgres + jobs
- `apps/athlete-mobile`: app mobile do atleta em Expo
- `apps/coach-web`: portal do coach em Next.js
- `apps/marketing-web`: landing, pricing e paginas publicas

## Packages

- `packages/contracts`: schemas tipados compartilhados
- `packages/domain`: regras puras de negocio

## Principle

Nenhuma feature do legado sera removida na reescrita.
O rebuild existe para substituir a base atual sem simplificar regras.
