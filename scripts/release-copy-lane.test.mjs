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

test('a shorter edit of JSX text, a copy attribute and a prose property is COPY', () => {
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
    'longer copy',
    /longer copy/,
    () => run(base.replace('Demo, og', 'Demo, og helt')),
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
    /occurs 2 times/,
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
