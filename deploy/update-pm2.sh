#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm ci
npm run prisma:deploy:local
npm run build
mkdir -p data
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
pm2 status
