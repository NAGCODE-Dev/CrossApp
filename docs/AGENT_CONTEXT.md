# Agent Context

Este arquivo existe para retomada rápida de trabalho no repositório sem reler todo o código.

## Estado atual

- Workspace não está mais limpo; a rodada atual deixou mudanças locais no `coach-portal` para concluir a migração do workspace para TypeScript.
- Último commit local identificado: `2b69c2e` - `feat(tests): enhance athlete and coach smoke tests, add new hooks and API mocks`.
- Verificações executadas nesta retomada:
  - `npm test` passou (`176` testes Node + `16` testes Vitest)
  - `npm run test:e2e` passou (`14` testes Playwright Chromium)
- Base incremental de TypeScript ligada:
  - `typescript`, `@types/react` e `@types/react-dom` adicionados
  - `tsconfig` compartilhado criado para o repo
  - `apps/athlete-react` e `coach-portal` preparados para migração gradual com `allowJs`
  - entrypoint `apps/athlete-react/main.tsx` já migrado e validado
  - shell React do atleta parcialmente migrada para TS:
    - `App.tsx`
    - `routes/TodayPage.tsx`
    - `components/ImportReviewSheet.tsx`
    - `hooks/useAthleteTodaySnapshot.ts`
    - `hooks/useAthleteImportFlow.ts`
    - `services/appShellState.ts`
    - `services/rollout.ts`
    - `services/todayViewModel.ts`
    - testes locais equivalentes em `ts/tsx`
  - validações mais recentes dessa fase:
    - `npm run typecheck:athlete-react` passou
    - `npm run test:athlete-react` passou
    - `npm run build:athlete-react` passou
  - borda com `packages/shared-web` começou a ser tipada com `.d.ts` locais:
    - `auth.d.ts`
  - início da migração real de `packages/shared-web` para TS:
    - `athlete-import-review.js` convertido para `athlete-import-review.ts`
    - `athlete-import-review.test.js` convertido para `athlete-import-review.test.ts`
    - `athlete-import-review.d.ts` removido após a conversão
    - `athlete-services.ts` criado para consumidores tipados, mantendo `athlete-services.js` como ponte legada de runtime
    - `athlete-services.d.ts` removido após a criação da versão `ts`
    - `athlete-shell.js` convertido para `athlete-shell.ts`
    - `athlete-shell.test.js` convertido para `athlete-shell.test.ts`
    - `athlete-shell.d.ts` removido após a conversão
    - `flowContracts.js` convertido para `flowContracts.ts`
    - `flowContracts.test.js` convertido para `flowContracts.test.ts`
    - `flowContracts.d.ts` removido após a conversão
    - `modality-shell.ts` criado como versão tipada segura, mantendo `modality-shell.js` intacto para runtime legado
  - classificação atual dos módulos compartilhados restantes:
    - `migrar já`: nenhuma peça crítica restante do `shared-web` na trilha nova
    - `manter ponte js + ts`: `athlete-services`, `modality-shell`
    - `deixar legado por enquanto`: `auth.js`, `runtime.js`, `api-client.js`
  - superfícies legadas ainda dependentes da ponte de runtime:
    - `sports/running/main.js` importa `athlete-services.js` e `modality-shell.js`
    - `sports/strength/main.js` importa `athlete-services.js` e `modality-shell.js`
  - cobertura nova para reduzir risco dessa ponte:
    - smoke Playwright de `running` com shell de login e shell autenticada
    - smoke Playwright de `strength` com shell autenticada
    - smoke Playwright de ação real em `running` e `strength` cobrindo prefill do treino do coach e submit do formulário
  - refinamento recente de UX nos shells legados:
    - `running` e `strength` agora deixam explícito no formulário quando o atleta está registrando um treino vindo do coach
    - CTA de submit muda de contexto para `Registrar treino do coach` após o prefill
  - refinamento recente de UX no fluxo principal do atleta:
    - modal de revisão de importação agora expõe contexto do arquivo, origem e modo da revisão com mais clareza
    - fallback visual amigável quando o parser ainda não montou dias resumidos
    - cobertura nova em `ImportReviewSheet.test.tsx`
  - refinamento recente de UX no `coach-portal`:
    - área de publicação agora resume erros, prontidão e rascunho em um callout único mais legível
    - regra do callout coberta em `workspaceHelpers.test.ts`
  - primeira fase do `coach-portal` em TS concluída:
    - `main.tsx`
    - `apiClient.ts`
    - `storage.ts`
    - `constants.ts`
    - `types.ts`
    - `workspaceHelpers.ts`
    - `workspaceTypes.ts`
    - `workspace.d.ts`
  - fase seguinte do `coach-portal` concluída:
    - `workspace.js` convertido para `workspace.tsx`
    - `main.tsx` atualizado para lazy import sem extensão fixa
    - contratos locais endurecidos para `subscription`, `gymAccess`, benchmarks, leaderboard e drafts
    - `workspace.d.ts` removido após a conversão, sem impacto em build/test/typecheck
  - validações do coach nessa fase:
    - `npm run typecheck:coach-portal` passou
    - `npm run test:coach-portal` passou
    - `npm run build:coach` passou
  - validação ampla mais recente após a limpeza do portal:
    - `npm test` passou
    - `npm run test:e2e` passou
  - validação ampla mais recente após avançar `packages/shared-web`:
    - `npm test` passou
    - `npm run test:e2e` passou
  - validação ampla mais recente após refinamentos de produto:
    - `npm test` passou
    - `npm run test:e2e` passou (`17` cenários Playwright, incluindo `smoke.sports.spec.js`)
  - correções recentes de robustez:
    - callback de auth Google do `coach-portal` corrigido para fluxo assíncrono real
    - logout do `coach-portal` alinhado com `signOut()` central
    - bug equivalente de auth redirect assíncrono corrigido no bootstrap legado do atleta
    - `check` agora inclui `typecheck`
    - `npm test` agora inclui testes dedicados do `coach-portal`
  - verificação final desta rodada:
    - `npm run test:e2e` passou após as correções de auth/coach
- O ciclo mais recente de trabalho ficou concentrado em:
  - endurecimento de smoke tests de atleta e coach
  - melhoria do fluxo local de QA
  - novos mocks/helpers de API para Playwright
  - ajustes de estado/renderização no app do atleta
  - migração incremental do `coach-portal` para `tsx/ts`
  - pequenos alinhamentos de configuração/backend/scripts

## Repositório em uma frase

`Ryxen` é uma plataforma de performance com superfícies separadas para atleta e coach, frontend web modular, backend Node/Express/Postgres e uma trilha local forte para smoke/QA.

## Áreas mais relevantes para retomar

### Frontend atleta

- `apps/athlete/`
- `apps/athlete-react/`
- `packages/shared-web/athlete-import-review.js`
- `src/ui/`

Sinais do último ciclo:
- hooks novos em `apps/athlete-react/hooks/`
- ajustes de UI state e render controller no atleta
- foco em importação, snapshot diário e actions da página de conta

### Backend

- `backend/src/config.js`
- `src/app.js`
- `src/app/accountSyncDomain.js`

Sinais do último ciclo:
- pequenos ajustes de configuração
- cobertura extra de domínio/sincronização por testes Node

### Testes e QA

- `__tests__/`
- `tests/`
- `tests/helpers/`
- `playwright.config.js`
- `scripts/run-playwright.sh`
- `scripts/playwright-web-server.mjs`
- `scripts/dev-backend-supabase-and-smoke.sh`
- `scripts/qa-local.mjs`

Essa foi a área principal da última rodada, junto da migração gradual do `coach-portal`.

## Comandos de retomada rápida

### Instalar dependências

```bash
npm install
cd backend && npm install
```

### Rodar testes principais

```bash
npm test
npm run test:e2e
```

### Subir fluxo local recomendado

```bash
npm run docker:up
ENABLE_AUTH_SMOKE=1 npm run dev:backend-supabase-and-smoke
npm run qa:local
```

## Documentos para contexto humano

- `README.md`
- `backend/README.md`
- `docs/ARCHITECTURE_TARGET.md`
- `docs/REFACTOR_BACKLOG.md`
- `docs/ops/COACH_TRIAL_RUNBOOK.md`
- `docs/ops/BACKEND_INTEGRATION.md`

## Leitura mínima sugerida antes de editar

Se a tarefa for de produto/fluxo:
- `README.md`

Se a tarefa for de backend/integração:
- `backend/README.md`
- `docs/ops/BACKEND_INTEGRATION.md`

Se a tarefa for de smoke/QA:
- este arquivo
- `package.json`
- `playwright.config.js`
- `tests/helpers/`

## Próximo ponto provável de continuidade

Se a intenção for continuar exatamente de onde a última rodada parou, o caminho mais provável é:

1. continuar refinando os fluxos de produto mais usados agora que a base TS/shared-web está mais estável
2. no atleta, o `Today` já ganhou um estado explícito de `sync` e `retry`, com CTA de `Tentar de novo` e fallback mais claro para importação local
3. no coach, a próxima frente de UX ainda mais valiosa tende a ser feedback de loading/erro em criação de sessão, grupos e publicação
4. só depois decidir se vale outra fatia de migração estrutural ou uma rodada de polish/QA mais ampla

## Atualização mais recente

- `apps/athlete-react/routes/TodayPage.tsx` agora mostra um card explícito de recuperação quando o snapshot remoto falha, em vez de deixar o erro só no subtítulo do hero
- o cold start do `Today` também ganhou um estado de sync mais honesto, explicando sessão, snapshot e fallback local
- `apps/athlete-react/routes/TodayPage.test.tsx` cobre agora:
  - render com treino
  - empty state
  - retry state quando o snapshot falha
  - sync state durante cold load
- `apps/athlete-react/App.tsx` e `apps/athlete-react/types.ts` foram alinhados para expor `onRetryLoad`
- `apps/athlete-react/styles.css` ganhou estilos para os novos cards de status

### Validação da atualização mais recente

- `npm run test:athlete-react` passou com `10` arquivos e `20` testes
- `npm run build:athlete-react` passou

## Atualização seguinte

- `coach-portal/workspace.tsx` agora tem feedback contextual por ação em `Operação` e `Programação`, sem depender só do `notice` global
- ações como `Criar gym`, `Adicionar membro`, `Criar grupo`, `Criar sessão` e `Publicar treino` passam a exibir loading/sucesso/erro no próprio contexto visual da tarefa
- `coach-portal/workspaceHelpers.ts` ganhou `getActionCalloutState()` para normalizar esses estados
- `coach-portal/workspaceHelpers.test.ts` agora cobre também os estados de loading, erro e sucesso desse novo callout
- `coach/styles/layout.css` ganhou variantes visuais para callouts de ação em progresso e erro

### Validação da atualização seguinte

- `npm run test:coach-portal` passou com `2` arquivos e `8` testes
- `npm run typecheck:coach-portal` passou
- `npm run build:coach` passou

## Fechamento da rodada

- a esteira ampla foi rerrodada depois dos refinamentos de UX no atleta e no coach
- `npm test` passou inteiro:
  - `176` testes Node
  - `20` testes do `athlete-react`
  - `8` testes do `coach-portal`
- `npm run test:e2e` passou com `17` cenários Playwright
- a base ficou estável com:
  - retry/sync mais explícitos no `Today` do atleta
  - feedback contextual por ação no `coach-portal`
  - smoke coverage protegendo `running` e `strength`

## Convenção para manter este arquivo útil

Ao encerrar uma sessão relevante, atualizar apenas:
- `Estado atual`
- `Áreas mais relevantes para retomar`
- `Próximo ponto provável de continuidade`

Manter curto. Este arquivo é um atalho operacional, não documentação completa.
