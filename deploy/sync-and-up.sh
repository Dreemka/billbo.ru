#!/usr/bin/env bash
set -euo pipefail

SERVER="${1:?usage: $0 user@host [remote_dir]}"
REMOTE_DIR="${2:-/opt/billbo.ru}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rsync -avz \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude 'frontend/dist' \
  --exclude .env.deploy \
  ./ "${SERVER}:${REMOTE_DIR}/"

ssh "$SERVER" "cd ${REMOTE_DIR} && docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d --build"

echo "Готово. Откройте https://billbo.ru (после распространения DNS)."
