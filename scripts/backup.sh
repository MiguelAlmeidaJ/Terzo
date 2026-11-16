#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

backup_root="${BACKUP_DIR:-/var/backups/terzo}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$backup_root/terzo-$timestamp"
postgres_container="${POSTGRES_CONTAINER:-terzo-postgres}"
postgres_user="${POSTGRES_USER:-terzo}"
postgres_database="${POSTGRES_DB:-terzo}"
backup_complete=false

cleanup_incomplete() {
  if [ "$backup_complete" != true ] && [ -n "$destination" ] && [ -d "$destination" ]; then
    rm -rf -- "$destination"
  fi
}
trap cleanup_incomplete EXIT

mkdir -p "$backup_root"
find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'terzo-*' -print0 \
  | while IFS= read -r -d '' previous_backup; do
      if [ ! -s "$previous_backup/postgres.dump" ] || [ ! -s "$previous_backup/postgres.contents.txt" ]; then
        rm -rf -- "$previous_backup"
      fi
    done

mkdir -p "$destination"

docker exec "$postgres_container" pg_dump \
  --username="$postgres_user" \
  --dbname="$postgres_database" \
  --format=custom \
  --no-owner \
  --no-privileges > "$destination/postgres.dump"

docker exec -i "$postgres_container" pg_restore --list \
  < "$destination/postgres.dump" > "$destination/postgres.contents.txt"

if [ -d data/blobs ]; then
  tar -czf "$destination/local-blobs.tar.gz" data/blobs
fi

find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'terzo-*' -printf '%T@ %p\n' \
  | sort -rn \
  | tail -n +31 \
  | cut -d' ' -f2- \
  | while IFS= read -r old_backup; do rm -rf -- "$old_backup"; done

backup_complete=true
echo "Backup concluído em $destination"
