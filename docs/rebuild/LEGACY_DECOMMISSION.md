# Legacy Decommission Log

Este arquivo registra o desligamento gradual do legado.
Regra: so removemos codigo antigo quando ele ja nao participa do runtime real
ou quando a funcionalidade equivalente ja existe na base nova.

## Removed

### 2026-04-12

- `coach/main.js`
  - motivo: artefato legado sem uso no runtime atual.
  - estado: removido.
  - observacao: o portal real hoje vem de `coach-portal/` via build Vite; `coach/index.html` ja usa script inline proprio e nao depende mais desse arquivo.

- `apps/athlete/runtimeShell.js`
  - motivo: bridge morto sem referencias no runtime, testes ou HTML.
  - estado: removido.
  - observacao: a entrada real do atleta continua em `apps/athlete/main.js` e `src/main.js`.

## Next safe candidates

- substituir o bridge local `coach/index.html` quando a superficie `rebuild/apps/coach-web` estiver capaz de assumir `/coach/`
- desligar wrappers legacy do atleta apenas quando existir paridade por feature na base nova
- cortar rotas Express antigas de `billing` e `athletes` assim que a API nova assumir esses contratos em ambiente real
