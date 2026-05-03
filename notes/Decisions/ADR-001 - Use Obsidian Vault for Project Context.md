# ADR-001 - Use Obsidian Vault for Project Context

## Status

Accepted

## Context

O projeto já tem documentação operacional útil, mas o contexto de sessões, decisões, roadmap e mapa mental de produto/arquitetura estava ficando espalhado.

## Decision

Usar `notes/` como vault leve do Obsidian dentro do repositório.

## Consequences

Positivas:

- contexto linkado entre sessões, QA, arquitetura e roadmap
- menos releitura completa do projeto a cada retomada
- boa convivência com `docs/AGENT_CONTEXT.md`

Cuidados:

- não transformar a vault em burocracia
- evitar duplicar documentação operacional
- manter `docs/AGENT_CONTEXT.md` curto e imediato

## Links

- [[../Home]]
- [[../Sessions/2026-05-03 - TypeScript Migration Session]]
