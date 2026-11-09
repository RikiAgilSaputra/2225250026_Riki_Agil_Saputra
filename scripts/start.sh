#!/usr/bin/env sh
# Menjalankan LangkahKu (macOS/Linux): build PWA lalu jalankan server di http://localhost:8000
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"

if [ ! -d "$API/.venv" ]; then
  python3 -m venv "$API/.venv"
  "$API/.venv/bin/python" -m pip install -r "$API/requirements.txt"
fi
[ -d "$WEB/node_modules" ] || (cd "$WEB" && npm install)
(cd "$WEB" && npm run build)

echo "LangkahKu berjalan di http://localhost:8000  (akun demo: siswa/siswa123, guru/guru123)"
cd "$API" && exec "$API/.venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
