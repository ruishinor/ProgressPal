import test from 'node:test';
import assert from 'node:assert/strict';

import { classify } from './release-copy-lane.mjs';

// All data synthetic. One source file, edited from `base` to `head`.
const FILE = 'src/features/demo/Panel.tsx';
const base = `export function Panel() {
  return (
    <Card description="Demo data changed in another window." className="card">
      <p>Demo, og teller ikke som demo.</p>
    </Card>
  );
}
const copy = { rule: 'Velg ett demosteg om gangen.', kind: 'order' };
`;

function run(head, { tests = [], sources, changes } = {}) {
  return classify({
    changes: changes ?? [['M', FILE]],
    read: (ref) => (ref === 'base' ? base : head),
    tests,
    sources: sources ?? [[FILE, base]],
  });
}

test('an edit of JSX text, a copy attribute and a prose property is COPY', () => {
  const result = run(
    base
      .replace('changed in another window.', 'changed.')
      .replace('Demo, og teller', 'Teller')
      .replace('Velg ett demosteg om gangen.', 'Velg ett demosteg.'),
  );
  assert.equal(result.lane, 'COPY', result.reasons.join('; '));
  assert.equal(result.edits.length, 3);
});

test('documentation and review evidence alone are COPY', () => {
  const result = classify({
    changes: [
      ['M', 'docs/ci.md'],
      ['A', 'docs/release-reviews/x.json'],
    ],
    read: () => '',
    tests: [],
    sources: [],
  });
  assert.equal(result.lane, 'COPY');
});

// Text in the other places copy lives: conditionals, translation calls,
// template text, plus places where a string is behaviour.
const WIDE = 'src/features/demo/Badge.tsx';
const wide = `import x from './demo path';
export function Badge({ done }: { done: boolean }) {
  const label = done ? 'Demo ferdig' : 'Demo ikke ferdig';
  if (state === 'Demo verdi') return null;
  const when = format(date, 'd. MMM yyyy');
  return (
    <Tag className="demo tag" title={\`\${count} demo igjen\`}>
      {t('Demo lagret', 'Demo saved')}
    </Tag>
  );
}
type DemoState = 'Demo tilstand' | 'other';
const h = { Authorization: \`Bearer \${x}\` };
`;
function runWide(head, sources = [[WIDE, wide]]) {
  return classify({
    changes: [['M', WIDE]],
    read: (ref) => (ref === 'base' ? wide : head),
    tests: [],
    sources,
  });
}

test('conditional, translation and template text, also longer, is COPY', () => {
  const result = runWide(
    wide
      .replace('Demo ikke ferdig', 'Demo er ikke ferdig ennå')
      .replace('demo igjen', 'demo gjenstår')
      .replace("'Demo saved'", "'Demo has been saved'"),
  );
  assert.equal(result.lane, 'COPY', result.reasons.join('; '));
  assert.equal(result.edits.length, 3);
});

test('the same text edited alike everywhere it occurs is COPY', () => {
  const other = ['src/other.tsx', 'const a = <p>Demo ferdig</p>;'];
  const result = classify({
    changes: [
      ['M', WIDE],
      ['M', other[0]],
    ],
    read: (ref, path) =>
      path === WIDE
        ? ref === 'base'
          ? wide
          : wide.replace('Demo ferdig', 'Demo klar')
        : ref === 'base'
          ? other[1]
          : other[1].replace('Demo ferdig', 'Demo klar'),
    tests: [],
    sources: [[WIDE, wide], other],
  });
  assert.equal(result.lane, 'COPY', result.reasons.join('; '));
});

const behaviour = [
  ['a compared value', () => wide.replace("'Demo verdi'", "'Demo verdi 2'")],
  ['a type', () => wide.replace('Demo tilstand', 'Demo tilstander')],
  ['a format string', () => wide.replace('d. MMM yyyy', 'd. MMMM yyyy')],
  ['a module path', () => wide.replace('./demo path', './demo paths')],
  ['a class list', () => wide.replace('demo tag', 'demo tags')],
  ['a header value', () => wide.replace('Bearer', 'Token')],
];
for (const [name, head] of behaviour) {
  test(`${name} is FULL`, () => {
    const result = runWide(head());
    assert.equal(result.lane, 'FULL');
    assert.match(result.reasons.join('\n'), /code changed/);
  });
}

const shorter = base.replace('Demo, og teller', 'Teller');
// Each FULL case must refuse for its own reason, not by accident.
const full = [
  [
    'a code change',
    /code changed/,
    () => run(base.replace('return (', 'return null && (')),
  ],
  [
    'a class name change',
    /code changed/,
    () => run(base.replace('className="card"', 'className="c"')),
  ],
  [
    'a non-copy property change',
    /code changed/,
    () => run(base.replace("kind: 'order'", "kind: 'list'")),
  ],
  [
    'a test locating by removed text',
    /a test matches/,
    () =>
      run(base.replace('changed in another window.', 'changed.'), {
        tests: [
          [
            'e2e/a.spec.ts',
            "page.getByRole('alert', { name: 'another window' });",
          ],
        ],
      }),
  ],
  [
    'a test pattern matching only the old copy',
    /a test matches/,
    () =>
      run(shorter, {
        tests: [['tests/a.test.ts', 'expect(x).toHaveText(/^Demo/);']],
      }),
  ],
  [
    'a test containing the old sentence',
    /a test matches/,
    () =>
      run(shorter, {
        tests: [
          ['tests/fixtures/a.json', '{"x":"Demo, og teller ikke som demo."}'],
        ],
      }),
  ],
  [
    'old copy used elsewhere in src',
    /occurs 2 times in src, 1 edited alike/,
    () =>
      run(shorter, {
        sources: [
          [FILE, base],
          ['src/other.ts', "const s = 'Demo, og teller ikke som demo.';"],
        ],
      }),
  ],
  [
    'an added file',
    /not a modification/,
    () => run(base, { changes: [['A', 'src/new.ts']] }),
  ],
  [
    'an added non-review JSON file',
    /not a modification/,
    () => run(base, { changes: [['A', 'docs/x.json']] }),
  ],
  [
    'a test file change',
    /not a source copy file/,
    () => run(base, { changes: [['M', 'e2e/a.spec.ts']] }),
  ],
  [
    'a persistence layer change',
    /persistence or protocol/,
    () => run(base, { changes: [['M', 'src/lib/db/demo.ts']] }),
  ],
  [
    'a dependency change',
    /not a source copy file/,
    () => run(base, { changes: [['M', 'package.json']] }),
  ],
  [
    'a stylesheet change',
    /not a source copy file/,
    () => run(base, { changes: [['M', 'src/styles/tokens.css']] }),
  ],
  ['no change', /no change/, () => run(base, { changes: [] })],
];
for (const [name, reason, outcome] of full) {
  test(`${name} is FULL`, () => {
    const result = outcome();
    assert.equal(result.lane, 'FULL');
    assert.match(result.reasons.join('\n'), reason);
  });
}
