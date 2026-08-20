/**
 * Cross-platform wrapper for `supabase gen types typescript`.
 *
 * Reads SUPABASE_PROJECT_ID from the environment and writes the generated
 * schema to lib/supabase/database.types.ts. Works on bash, cmd, and
 * PowerShell (the old `$SUPABASE_PROJECT_ID > file` script only worked on bash).
 *
 * Usage: npm run gen:types
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(root, '../lib/supabase/database.types.ts');

const projectId = process.env.SUPABASE_PROJECT_ID;
if (!projectId) {
  console.error('SUPABASE_PROJECT_ID is not set. Add it to .env.local (see .env.example).');
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  ['supabase', 'gen', 'types', 'typescript', '--project-id', projectId, '--schema', 'public'],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'supabase gen types failed');
  process.exit(result.status ?? 1);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, result.stdout);
console.log(`Wrote generated types to ${outFile}`);