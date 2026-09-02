#!/usr/bin/env node
/**
 * Guard against hardcoded neutral grays in app UI.
 * Run: npm run lint:tokens
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

const ALLOWLIST = new Set([
  path.join(SRC, 'utils/themeColors.js'),
  path.join(SRC, 'index.css'),
]);

const PATTERNS = [
  { re: /#64748b/i, label: '#64748b' },
  { re: /#94a3b8/i, label: '#94a3b8' },
  { re: /#9ca3af/i, label: '#9ca3af' },
  { re: /text-slate-400\b/, label: 'text-slate-400' },
  { re: /text-slate-500\b/, label: 'text-slate-500' },
  { re: /placeholder:text-app-muted\b/, label: 'placeholder:text-app-muted' },
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...(await walk(full)));
    } else if (/\.(jsx?|tsx?|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const files = await walk(SRC);
const violations = [];

for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const { re, label } of PATTERNS) {
    if (re.test(text)) {
      violations.push(`${path.relative(ROOT, file)}: ${label}`);
    }
  }
}

if (violations.length) {
  console.error('Theme token violations (use app-* / sidebar-* tokens instead):\n');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('Theme token check passed.');
