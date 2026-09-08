#!/bin/bash
set -e

BACKUP_SOURCE="$1"

if [ -z "$BACKUP_SOURCE" ]; then
  # Auto-detect default 9router paths if not provided
  if [ -f "/root/.9router/db/data.sqlite" ]; then
    BACKUP_SOURCE="/root/.9router/db/data.sqlite"
  elif [ -f "/root/.9router-backup-2026-07-08/db/data.sqlite" ]; then
    BACKUP_SOURCE="/root/.9router-backup-2026-07-08/db/data.sqlite"
  fi
fi

if [ -z "$BACKUP_SOURCE" ] || [ ! -e "$BACKUP_SOURCE" ]; then
  echo "Usage: $0 [/path/to/backup.json | /path/to/data.sqlite | /path/to/auth_dir]"
  echo "Error: target backup not found"
  exit 1
fi

echo "==> Importing into SotaRouter from: $BACKUP_SOURCE"

# Case 1: SQLite database (.sqlite / .db)
if [[ "$BACKUP_SOURCE" == *.sqlite* ]] || [[ "$BACKUP_SOURCE" == *.db* ]]; then
  sqlite3 "$BACKUP_SOURCE" "SELECT json_object('providerConnections', json_group_array(json_object('id', id, 'provider', provider, 'authType', authType, 'name', name, 'email', email, 'priority', priority, 'data', json(data)))) FROM providerConnections WHERE isActive=1;" | \
    curl -s -X POST http://127.0.0.1:3300/api/providers -H "Content-Type: application/json" -d @-
  echo ""
  echo "==> SQLite backup import finished!"
  exit 0
fi

# Case 2: JSON file (.json)
if [[ "$BACKUP_SOURCE" == *.json* ]] || [[ "$BACKUP_SOURCE" == *.txt* ]]; then
  curl -s -X POST http://127.0.0.1:3300/api/providers -H "Content-Type: application/json" -d @"$BACKUP_SOURCE"
  echo ""
  echo "==> JSON backup import finished!"
  exit 0
fi

# Case 3: Directory containing .9router.json files
if [ -d "$BACKUP_SOURCE" ]; then
  COUNT=0
  for f in $(find "$BACKUP_SOURCE" -name "*.9router.json" -o -name "*.json"); do
    RES=$(curl -s -X POST http://127.0.0.1:3300/api/providers -H "Content-Type: application/json" -d @"$f")
    COUNT=$((COUNT+1))
  done
  echo "==> Processed $COUNT files from $BACKUP_SOURCE"
  echo "==> Directory import finished!"
  exit 0
fi
