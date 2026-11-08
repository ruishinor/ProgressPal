import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPaths,
  compareCopy,
  compareLightweightCopy,
} from './release-change-classification.mjs';
import { readFileSync } from 'node:fs';
import {
  lightweightUiCopyPaths,
  lightweightUiCopyPathSet,
} from './ui-copy-change-policy.mjs';

const changed = (status, path) => ({ status, path });
test('METADATA requires the one modified regular LICENSE path', () => {
  assert.equal(classifyPaths([changed('M', 'LICENSE')]), 'METADATA');
  for (const entry of [
    changed('A', 'LICENSE'),
    changed('D', 'LICENSE'),
    changed('M', '.github/workflows/test.yml'),
  ]) {
    assert.equal(classifyPaths([entry]), 'FULL');
  }
});
test('COPY accepts only explicitly designated UI copy', () => {
  assert.equal(
    classifyPaths([changed('M', 'src/ui-copy/interface.json')]),
    'COPY',
  );
  assert.equal(
    classifyPaths([changed('M', 'src/features/rpg/routes/RpgHomePage.tsx')]),
    'FULL',
  );
  assert.equal(classifyPaths([changed('M', 'unknown.json')]), 'FULL');
  assert.equal(classifyPaths([]), 'FULL');
  assert.equal(
    classifyPaths([
      changed('M', 'LICENSE'),
      changed('M', 'src/ui-copy/interface.json'),
    ]),
    'FULL',
  );
  assert.equal(
    classifyPaths([
      changed('M', 'src/ui-copy/interface.json'),
      changed('M', 'src/app/router/routeDefinitions.ts'),
    ]),
    'FULL',
  );
});
test('copy changes and reversions with unchanged structure are accepted', () => {
  assert.equal(
    compareCopy(
      '{"nav":{"profile":"Profile","name":"Hello {user}"}}',
      '{"nav":{"profile":"Profil","name":"Hei {user}"}}',
    ),
    2,
  );
  assert.equal(
    compareCopy(
      '{"nav":{"profile":"Profil"}}',
      '{"nav":{"profile":"Profile"}}',
    ),
    1,
  );
});
test('copy validates keys, placeholders and plain text', () => {
  assert.throws(
    () =>
      compareCopy(
        '{"nav":{"name":"Hi {name}"}}',
        '{"nav":{"name":"Hei {first}"}}',
      ),
    /placeholder/,
  );
  assert.throws(
    () => compareCopy('{"nav":{"name":"Hi"}}', '{"nav":{"extra":"Hi"}}'),
    /structure/,
  );
  assert.throws(
    () => compareCopy('{"nav":{"name":"Hi"}}', '{"nav":{"name":"<img>"}}'),
    /plain-text/,
  );
  assert.throws(
    () => compareCopy('{"nav":{"name":"Hi"}}', '{"nav":{"name":" "}}'),
    /plain-text/,
  );
});

test('COPY policy explicitly approves existing catalogue keys without duplicates', () => {
  const catalogue = JSON.parse(
    readFileSync(
      new URL('../src/ui-copy/interface.json', import.meta.url),
      'utf8',
    ),
  );
  const values = {};
  const visit = (node, prefix = '') => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') values[path] = value;
      else visit(value, path);
    }
  };
  visit(catalogue);
  assert.equal(
    new Set(lightweightUiCopyPaths).size,
    lightweightUiCopyPaths.length,
  );
  assert.ok(lightweightUiCopyPaths.length > 200);
  for (const path of lightweightUiCopyPaths) {
    assert.equal(
      typeof values[path],
      'string',
      `Missing approved key: ${path}`,
    );
  }
});

test('routine wording change and its reversal qualify, protected meaning does not', () => {
  const original = {
    navigation: { profile: 'Profile' },
    pathways: { progressInfoBody: 'About status' },
  };
  const edit = structuredClone(original);
  edit.navigation.profile = 'Profil';
  assert.deepEqual(
    compareLightweightCopy(JSON.stringify(original), JSON.stringify(edit))
      .changed,
    ['navigation.profile'],
  );
  assert.deepEqual(
    compareLightweightCopy(JSON.stringify(edit), JSON.stringify(original))
      .changed,
    ['navigation.profile'],
  );
  edit.pathways.progressInfoBody = 'Everyone passed';
  assert.throws(
    () =>
      compareLightweightCopy(JSON.stringify(original), JSON.stringify(edit)),
    /COPY_KEY_REQUIRES_FULL: pathways.progressInfoBody/,
  );
});

test('sensitive contexts are denied even for a structurally valid single sentence', () => {
  const protectedKeys = [
    'pathways.progressInfoBody',
    'surfaces.homePage.progressPalStoresYourProgressInThisBrowserIt',
    'surfaces.classicShell.thisBrowserContextCannotProvideTheRequiredWeb',
    'surfaces.importBackupControl.importingReplacesAllLocalDataOnThisDevice',
    'surfaces.settingsCloudRestorePanel.restoringReplacesAllLearnerDataOnThisDevice',
    'surfaces.settingsScreen.persistentPermissionIsNotABackupYouThe',
    'surfaces.settingsCloudBackupCard.offOnThisDeviceWhileItIsOff',
    'surfaces.rpgHome.eachTaskIsCountedOnceByItsLatest',
    'surfaces.studySessions.thisActionClearsTheCurrentLiveTimerNotes',
    'surfaces.settingsScreen.resetAllLocalData',
  ];
  for (const key of protectedKeys) {
    assert.equal(lightweightUiCopyPathSet.has(key), false, key);
  }
  assert.equal(lightweightUiCopyPathSet.has('navigation.profile'), true);
  assert.equal(lightweightUiCopyPathSet.has('pathways.statusStarted'), true);
  assert.equal(lightweightUiCopyPathSet.has('unknown.future.copy.key'), false);
});

test('unknown fields, modified placeholders and malformed copy never qualify', () => {
  assert.throws(
    () =>
      compareLightweightCopy(
        '{"navigation":{"profile":"Profile"}}',
        '{"navigation":{"profile":"Profil","extra":"X"}}',
      ),
    /structure/,
  );
  assert.throws(
    () =>
      compareLightweightCopy(
        '{"navigation":{"profile":"Hello {name}"}}',
        '{"navigation":{"profile":"Hei {user}"}}',
      ),
    /placeholder/,
  );
  assert.throws(
    () =>
      compareLightweightCopy(
        '{"navigation":{"profile":"Profile"}}',
        '{"navigation":{"profile":"<script>"}}',
      ),
    /plain-text/,
  );
});

test('each protected claim falls back to FULL even when it is the only edited leaf', () => {
  const sensitive = [
    'surfaces.homePage.progressPalStoresYourProgressInThisBrowserIt',
    'surfaces.importBackupControl.importingReplacesAllLocalDataOnThisDevice',
    'surfaces.settingsCloudRestorePanel.restoringReplacesAllLearnerDataOnThisDevice',
    'surfaces.settingsCloudBackupCard.offOnThisDeviceWhileItIsOff',
    'surfaces.studySessions.thisActionClearsTheCurrentLiveTimerNotes',
  ];
  for (const fullKey of sensitive) {
    const [top, group, key] = fullKey.split('.');
    const base = { [top]: { [group]: { [key]: 'Original statement' } } };
    const candidate = { [top]: { [group]: { [key]: 'Everything is fine' } } };
    assert.throws(
      () =>
        compareLightweightCopy(JSON.stringify(base), JSON.stringify(candidate)),
      /COPY_KEY_REQUIRES_FULL/,
      fullKey,
    );
  }
});
