#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build >/tmp/bellerouge-admin-build.log 2>&1 || {
  echo "Build failed. Tail:" >&2
  tail -n 60 /tmp/bellerouge-admin-build.log >&2
  exit 1
}

node - <<'NODE'
const fs = require('fs');
const path = '.next/server/app-paths-manifest.json';
const required = [
  '/admin/page',
  '/admin/finance/page',
  '/admin/ops/page',
  '/admin/disputes/page',
  '/admin/requests/page',
  '/admin/users/page',
  '/admin/inbox/page',
  '/admin/settings/page',
];
const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
const missing = required.filter((k) => !(k in manifest));
if (missing.length) {
  console.error('Missing admin routes:', missing.join(', '));
  process.exit(1);
}
console.log('Admin route manifest check passed.');
NODE
