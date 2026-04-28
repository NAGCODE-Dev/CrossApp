#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[purge-history] erro: execute dentro de um repositório Git."
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  cat <<'EOF'
[purge-history] erro: git-filter-repo não está instalado.

Instale com uma destas opções:
  pip install --user git-filter-repo
  python3 -m pip install --user git-filter-repo

Depois rode novamente:
  bash scripts/purge-leaked-secrets-history.sh
EOF
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current || true)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_BRANCH="backup/pre-filter-repo-${TIMESTAMP}"

echo "[purge-history] criando branch de backup: ${BACKUP_BRANCH}"
git branch "${BACKUP_BRANCH}"

echo "[purge-history] removendo .env.supabase e backend/.env de todo o histórico"
git filter-repo \
  --force \
  --invert-paths \
  --path .env.supabase \
  --path backend/.env

cat <<EOF

[purge-history] concluído.

Próximos passos:
  1. Revise o resultado com:
     git log --stat -- .env.supabase backend/.env
  2. Confirme que os arquivos não aparecem mais no histórico:
     git rev-list --all -- .env.supabase backend/.env
  3. Faça force-push da branch reescrita:
     git push origin ${CURRENT_BRANCH:-main} --force-with-lease
  4. Rotacione imediatamente os segredos vazados no provedor.
  5. Se o repositório já teve forks ou clones de terceiros, trate o segredo antigo como comprometido permanentemente.

Branch de backup local:
  ${BACKUP_BRANCH}
EOF
