#!/bin/bash
set -e
DB="/root/.9router/db/data.sqlite"
if [ ! -f "$DB" ]; then
  echo "9Router DB not found at $DB"
  exit 1
fi

sqlite3 "$DB" "SELECT json_object('providerConnections', json_group_array(json_object('id', id, 'provider', provider, 'authType', authType, 'name', name, 'email', email, 'priority', priority, 'data', json(data)))) FROM providerConnections WHERE isActive=1;" | \
  curl -s -X POST http://127.0.0.1:3300/api/providers -H "Content-Type: application/json" -d @-

echo ""
echo "Sync complete!"
