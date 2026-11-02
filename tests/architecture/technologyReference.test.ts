import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps reference reading independent of learner stores, programmes and exercise engines', () => {
  const folder = 'src/features/technologyReference';
  for (const file of readdirSync(folder).filter((name) =>
    /\.tsx?$/.test(name),
  )) {
    const text = readFileSync(`${folder}/${file}`, 'utf8');
    const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
      (match) => match[1],
    );
    for (const name of imports)
      expect(
        name === 'react-router-dom' ||
          name === '@/lib/routing/rpgRoutePaths' ||
          name.startsWith('./'),
        `${file}: ${name}`,
      ).toBe(true);
    expect(text).not.toMatch(
      /indexedDB|localStorage|sessionStorage|useAppState|MicroShell|SessionRunner/,
    );
  }
});
