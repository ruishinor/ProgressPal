import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const source = join('dist', 'pilot.html');
const destination = join('dist', 'index.html');

if (!existsSync(source) || existsSync(destination)) {
  throw new Error('Unexpected pilot build output: expected pilot.html only.');
}
renameSync(source, destination);
console.log('Pathways-only entry installed as dist/index.html');
