# Athlete Surface

`apps/athlete` é a superfície de produto do atleta no Ryxen.

## O que pertence aqui

- treino do dia
- histórico
- PRs
- medidas
- importação
- billing do atleta
- sync local/remoto
- preferências

## O que não pertence aqui

- marketing da landing
- entry flow do hub
- operação de coach
- publishing e administração de box

## Estrutura alvo

```text
apps/athlete/
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
  hooks/
  state/
  services/
```

## Regra de migração

Ao extrair código legado de `src/app`, `src/ui` ou `src/ui/actions`,
prefira mover por feature do atleta, não por tipo técnico isolado.
