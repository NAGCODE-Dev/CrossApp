# Feature Preservation Matrix

Este documento define o comportamento que a reescrita precisa manter.
Nada abaixo pode ser "simplificado" sem decisão explícita.

## Athlete app

- Login por email/senha.
- Signup com verificação por codigo.
- Sign-in com Google.
- Refresh de sessao autenticada.
- Sign-out.
- Recuperacao de senha por codigo.
- Fluxo de suporte para reset quando entrega por email falhar.
- Sign-in por trusted device no mesmo aparelho.
- Persistencia de grant de trusted device localmente.
- Restore de sessao sem limpar dados locais quando a conta nao mudou.
- Limpeza de dados locais quando a conta autenticada muda.
- Estado local offline-first para UI do atleta.
- Snapshot remoto do app state.
- Fila de sync pendente quando offline.
- Restore remoto de app state.
- Restore remoto de plano importado.
- Importacao de PDF.
- Importacao de txt.
- Importacao de csv.
- Importacao de json legado e estruturado.
- Importacao de imagem com OCR.
- Importacao de video com OCR por frames.
- Importacao de planilhas xlsx/xls/ods.
- Preview antes de salvar importacao.
- Cancelamento de preview sem persistir.
- Bloqueio de arquivos acima de 50 MB.
- Compressao de imagem no cliente antes da importacao.
- Normalizacao defensiva de workout importado.
- Backup completo do estado local.
- Restauracao completa de backup.
- PRs manuais.
- Importacao/exportacao de PRs.
- Snapshot remoto de PRs.
- Calculo de cargas a partir de PRs.
- Benchmark results por slug.
- Historico de benchmarks.
- Historico de PRs.
- Measurements com snapshot e historico.
- Running logs e running history.
- Strength logs e strength history.
- Feed de treino do coach por gym.
- Prioridade entre treino importado e treino do coach.
- Running/Strength/Cross como modalidades reais.
- Tour guiado Nyx atravessando Hoje, Evolucao e Conta.
- Timer de treino com presets, popup e fullscreen.
- Preferencias de tema visual, densidade e reduce motion.
- Telemetria com consentimento LGPD.
- Shell web e shell nativo com Capacitor.
- PWA com offline e service worker.

## Coach portal

- Login por email/senha.
- Sign-in com Google.
- Billing return success/cancel no portal.
- Dashboard com status de assinatura.
- Entitlements e gym access.
- Criacao de gym.
- Listagem de gyms do usuario.
- Convite de memberships coach/athlete.
- Listagem de memberships.
- Criacao de grupos por sportType.
- Listagem de grupos com membros.
- Publicacao de workout para:
  - todos
  - memberships selecionados
  - grupos selecionados
- Draft local do workout.
- Feed de workouts publicados.
- Insights por gym e sportType.
- Biblioteca de benchmarks com busca, filtro e paginacao.
- Leaderboard por benchmark slug.
- Competitions e calendarios quando liberados por feature.
- Ativacao local de billing para admin/dev.
- Tratamento de resposta HTML invalida sem quebrar parse JSON.

## Billing and access policy

- Billing externo por Kiwify link no frontend.
- Webhook/postback Kiwify no backend.
- Claim pendente por email quando usuario ainda nao existir.
- Aplicacao de claim no proximo signup/signin.
- Reversal claim para cancelamento/estorno.
- Status de assinatura.
- Entitlements por usuario.
- Grace period para coach e atleta.
- Regras de acesso por gym/owner subscription.
- Mock billing apenas para admin/dev.

## Admin and ops

- Primeiro usuario vira admin automaticamente.
- ADMIN_EMAILS recebem admin.
- Overview administrativo.
- Health operacional.
- Reprocessamento manual de billing claims.
- Retry manual de jobs de email.
- Reset manual de senha por admin.
- Aprovar/negar password reset support request.
- Solicitar exclusao de conta.
- Excluir conta imediatamente.
- Fluxo HTML para responder link de exclusao.
- Workers de email, account deletion e retention.
- Retencao automatica de tabelas operacionais.

## Telemetry and observability

- Ingest de telemetria em lote.
- User id opcional decodificado do token.
- Sentry no frontend e backend.
- Analytics e speed insights nas superficies web.
- Marcadores de bootstrap e erros globais.

## Non-functional requirements preserved in the rewrite

- Compatibilidade com multiplas superficies: mobile athlete, coach web, marketing web.
- Auth, billing, access e dados continuam centralizados no backend.
- Contratos compartilhados entre apps.
- Capacidade real de operar offline no atleta.
- Estrategia de migracao sem quebra abrupta do legado.
