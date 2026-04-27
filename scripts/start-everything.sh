#!/usr/bin/env bash
# Start Docker DB (optional), PM2 stack from ecosystem.config.js, nginx if down.
# Run from repo root: bash scripts/start-everything.sh
# nginx often needs: sudo systemctl start nginx
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1) Docker DB (Postgres/Redis) ==="
if bash "$ROOT/scripts/db-up.sh" 2>/dev/null; then
  echo "db-up OK"
else
  echo "db-up skipped or failed (no Docker is OK if API uses remote DB)"
fi

echo ""
echo "=== 2) PM2 (ecosystem.config.js) ==="
pm2 start "$ROOT/ecosystem.config.js" --update-env || { pm2 resurrect || true; }
pm2 status

echo ""
echo "=== 3) nginx ==="
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "nginx: already active"
  elif systemctl start nginx 2>/dev/null; then
    echo "nginx: started"
  else
    echo "nginx is off: run  sudo systemctl start nginx"
  fi
else
  echo "no systemctl; start nginx manually"
fi

echo ""
echo "Quick check: curl -sS http://127.0.0.1:4001/health && curl -sS http://127.0.0.1:4050/health"
