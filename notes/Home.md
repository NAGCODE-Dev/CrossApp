# Ryxen Home

## Navegação

- [[Inbox/Start Here]]
- [[Sessions/2026-05-03 - TypeScript Migration Session]]
- [[Roadmaps/TypeScript Migration Roadmap]]
- [[QA/Current QA Status]]
- [[Architecture/Current Architecture Snapshot]]
- [[Product/Product Surface Map]]
- [[Decisions/ADR-001 - Use Obsidian Vault for Project Context]]

## Fontes do repo

- [Agent Context](../docs/AGENT_CONTEXT.md)
- [Architecture Target](../docs/ARCHITECTURE_TARGET.md)
- [Refactor Backlog](../docs/REFACTOR_BACKLOG.md)
- [Backend Integration](../docs/ops/BACKEND_INTEGRATION.md)
- [README](../README.md)

## Estado rápido

- base de testes local validada
- E2E Playwright Chromium validado
- migração incremental para `React + TypeScript` em andamento
- shell React do atleta já tem entrypoint, componentes principais e hooks centrais em TS

## Captura rápida

- notas novas vão para `notes/Inbox/`
- sessões podem usar `notes/Templates/Session Template.md`
- decisões podem usar `notes/Templates/Decision Template.md`
- roadmaps podem usar `notes/Templates/Roadmap Template.md`

## Próximos focos

- continuar tipando a borda de `apps/athlete-react`
- reduzir casts entre shell React e `packages/shared-web`
- decidir quando puxar tipagem para `packages/shared-web`
- manter QA local estável durante a migração
