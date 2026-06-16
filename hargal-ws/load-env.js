// Loads .env from hargal-ws/.env or project root .env — no external deps needed
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
];

for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
  break;
}
