#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

corepack enable
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
mkdir -p data
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status
