import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const destinationRoot = 'dist';
const source = join(destinationRoot, 'pilot.html');
const destination = join(destinationRoot, 'index.html');

if (!existsSync(source) || existsSync(destination)) {
  throw new Error('Unexpected pilot build output: expected pilot.html only.');
}

const contentDir = join(destinationRoot, 'content');
const gitDir = join(contentDir, 'git-github');
if (!existsSync(gitDir) || !statSync(gitDir).isDirectory()) {
  throw new Error('Git & GitHub Pathways content missing from pilot build.');
}

// The regular Vite publicDir copy includes other course assets by default.
// Fail closed by retaining only the Pathways course, not merely hiding links.
for (const entry of readdirSync(contentDir)) {
  if (entry !== 'git-github') {
    rmSync(join(contentDir, entry), { recursive: true, force: true });
  }
}

// This pilot does not register a service worker or use the main app's
// progressive-web-app, achievements or character-profile artwork.
for (const path of [
  'sw.js',
  'manifest.webmanifest',
  'icons',
  'assets/activity',
  'assets/avatars',
  'assets/badges',
  'assets/character-profile.png',
]) {
  rmSync(join(destinationRoot, path), { recursive: true, force: true });
}

renameSync(source, destination);
console.log('Pathways-only entry and Git-only static content installed in dist/');
