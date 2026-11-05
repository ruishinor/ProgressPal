// Programme-specific exporter; shared content schemas/provider stay unchanged.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { gitLessons } from '../src/programmes/git-github/source.mjs';
import { gitM02Lessons } from '../src/programmes/git-github/m02.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePaths = [
  'src/programmes/git-github/source.mjs',
  'src/programmes/git-github/m02.mjs',
];
const hash = (value) => createHash('sha256').update(value).digest('hex');
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonical(value[key]))
      .join(',') +
    '}'
  );
}
const sourceBytes = Buffer.concat(
  sourcePaths.map((path) => readFileSync(resolve(root, path))),
);
const sourceSha256 = hash(sourceBytes);
const authoredModules = [
  {
    moduleId: 'GIT-M01',
    title: 'Fra null til din første commit',
    order: 0,
    lessons: gitLessons,
  },
  {
    moduleId: 'GIT-M02',
    title: 'Finn og forstå tidligere versjoner',
    order: 1,
    lessons: gitM02Lessons,
  },
];
const programmeId = 'git-github';
const common = { programmeId, contentVersion: 1, evaluatorContractVersion: 1 };
function buildModule(
  { moduleId, title, order: moduleOrder, lessons },
  previousSkillId,
) {
  const units = lessons.map((lesson, order) => ({
    unit_id: moduleId + '-L0' + (order + 1),
    kind: 'L',
    title_nb: lesson.title,
    goal_nb: lesson.goal,
    optional: false,
    mission: lesson.missionId,
    flow: lesson.flow.flat().map((block) => {
      if (!block.id) return block;
      const selfReport = ['checklist', 'reflect'].includes(block.type);
      const { type, ...authored } = block;
      return {
        t: 'exercise',
        ...authored,
        type,
        response_mode: type,
        role: order === lessons.length - 1 ? 'quest' : 'formative',
        activity: order === lessons.length - 1 ? 'independent' : 'guided',
        optional: block.optional ?? false,
        evaluable: !selfReport,
        evidence_trust: selfReport
          ? 'optional-reflection'
          : type === 'evidence'
            ? 'self-reported-paste'
            : 'deterministic-evaluator',
        evidence_layer: selfReport ? 'C' : type === 'evidence' ? 'B' : 'A',
        feedback: {
          correct:
            type === 'evidence'
              ? 'Teksten inneholder bare plan.txt. Det passer med utvalget oppgaven ber om; kjøring og filinnhold er ikke bekreftet.'
              : 'Svaret passer med situasjonen som er beskrevet.',
          incorrect:
            type === 'evidence'
              ? 'Teksten skal bare inneholde filnavnlisten med plan.txt. Undersøk utvalget og kopier bare utskriften fra riktig kommando.'
              : 'Les forklaringen til valget og prøv igjen.',
        },
        hints: block.hints ?? [],
        checkpoint_task: null,
        unit: moduleId + '-L0' + (order + 1),
        required_practice: !selfReport && !block.optional,
        mastery_gate: false,
        skill_ids: [lesson.skillId],
        ...(type === 'mcq'
          ? {
              code: null,
              code_lang: 'text',
              multi: false,
              evaluator: {
                mode: 'choice',
                correct: block.options
                  .filter((option) => option.correct)
                  .map((option) => option.id),
                shuffle: true,
              },
            }
          : {}),
        ...(selfReport
          ? {
              evaluator: {
                mode: type === 'checklist' ? 'self-check' : 'self-report',
                mastery_gate: false,
              },
            }
          : {}),
      };
    }),
  }));
  const missions = lessons.map((lesson, order) => ({
    missionId: lesson.missionId,
    itemId: lesson.missionId.toLowerCase(),
    surface: 'mission',
    title: lesson.title,
    goal: lesson.goal,
    minutes: 0,
    optional: false,
    order,
    unitIds: [units[order].unit_id],
  }));
  const module = {
    moduleId,
    catalogueUnitId: moduleId.toLowerCase(),
    title,
    order: moduleOrder,
    checkpoint: { missionId: null, criticalGateSkillIds: [], tasks: [] },
    missions,
  };
  const skills = lessons.map((lesson, order) => ({
    skillId: lesson.skillId,
    gatingRole: 'developmental',
    prerequisiteSkillIds:
      order === 0
        ? previousSkillId === null
          ? []
          : [previousSkillId]
        : [lessons[order - 1].skillId],
    introducedInModule: moduleId,
    introducingMissionId: lesson.missionId,
    stateTargetModule: moduleId,
    retention: { target: false, gate: false, opportunityUnits: [] },
    integrationTarget: false,
  }));
  const exercises = units.flatMap((unit) =>
    unit.flow
      .filter((block) => block.t === 'exercise')
      .map((exercise, order) => ({
        exerciseId: exercise.id,
        subjectId: exercise.id.toLowerCase(),
        moduleId,
        missionId: unit.mission,
        unitId: unit.unit_id,
        unitKind: unit.kind,
        order,
        responseMode: exercise.response_mode,
        evaluatorMode: exercise.evaluator.mode,
        role: exercise.role,
        activity: exercise.activity,
        optional: exercise.optional,
        evaluable: exercise.evaluable,
        requiredPractice: exercise.required_practice,
        masteryGate: false,
        evidenceTrust: exercise.evidence_trust,
        evidenceLayer: exercise.evidence_layer,
        checkpointTask: null,
        skillIds: exercise.skill_ids,
        needsRuntime: false,
        hintCount: exercise.hints.length,
        rewardEventId: null,
        contentHash: hash(canonical(exercise)),
      })),
  );
  const unitMeta = units.map((unit, order) => ({
    unitId: unit.unit_id,
    kind: unit.kind,
    missionId: unit.mission,
    moduleId,
    optional: false,
    teaches: [lessons[order].skillId],
    practises: [lessons[order].skillId],
    models: [],
    retrieves: [],
  }));
  return { module, skills, exercises, units, unitMeta };
}
let lastSkill = null;
const built = authoredModules.map((definition) => {
  const result = buildModule(definition, lastSkill);
  lastSkill = definition.lessons.at(-1).skillId;
  return result;
});
const modules = built.map((entry) => entry.module);
const skills = built.flatMap((entry) => entry.skills);
const exercises = built.flatMap((entry) => entry.exercises);
const index = {
  format: 'progresspal-programme-content',
  formatVersion: 1,
  ...common,
  language: 'nb',
  technicalLanguage: 'en',
  source: {
    artefact: sourcePaths.join(' + '),
    schema: 'progresspal-git-pilot-authoring',
    schemaVersion: '1',
    sha256: sourceSha256,
    bytes: sourceBytes.length,
    status:
      'Originally authored local pilot; no external execution authenticated.',
    skillGraphSha256: hash(canonical(skills)),
    structureSha256: hash(canonical(modules)),
    knownSourceDefects: [],
  },
  checkpointRules: [],
  gateRetryRule: null,
  modules,
  skills,
  exercises,
  units: built.flatMap((entry) => entry.unitMeta),
};
function asset(stem, value) {
  const text = JSON.stringify(value) + '\n';
  const sha256 = hash(text);
  return {
    text,
    descriptor: {
      path: 'content/git-github/' + stem + '.' + sha256.slice(0, 16) + '.json',
      sha256,
      bytes: Buffer.byteLength(text),
    },
  };
}
const indexAsset = asset('index', index);
const moduleAssets = built.map(({ module, units }) => ({
  moduleId: module.moduleId,
  asset: asset(module.catalogueUnitId, {
    format: 'progresspal-programme-lessons',
    formatVersion: 1,
    ...common,
    moduleId: module.moduleId,
    sourceSha256,
    units,
  }),
}));
const catalogue = {
  format: 'progresspal-programme-catalogue',
  formatVersion: 1,
  ...common,
  language: 'nb',
  technicalLanguage: 'en',
  sourceSha256,
  modules: modules.map((module) => ({
    moduleId: module.moduleId,
    catalogueUnitId: module.catalogueUnitId,
    title: module.title,
    order: module.order,
    missions: module.missions.map((mission) => ({
      missionId: mission.missionId,
      itemId: mission.itemId,
      surface: mission.surface,
      title: mission.title,
      minutes: mission.minutes,
      optional: mission.optional,
      order: mission.order,
    })),
  })),
  subjectIds: exercises.map((exercise) => exercise.subjectId),
  assets: {
    index: indexAsset.descriptor,
    modules: Object.fromEntries(
      moduleAssets.map(({ moduleId, asset }) => [moduleId, asset.descriptor]),
    ),
  },
};
const offlinePath = resolve(root, 'public/content/offline.json');
const offline = JSON.parse(readFileSync(offlinePath, 'utf8'));
const generatedAssets = [indexAsset, ...moduleAssets.map((item) => item.asset)];
offline.assets = [
  ...offline.assets.filter((path) => !path.startsWith('/content/git-github/')),
  ...generatedAssets.map((entry) => '/' + entry.descriptor.path),
].sort();
const config = await prettier.resolveConfig(resolve(root, 'package.json'));
const outputs = [
  [
    'src/programmes/git-github/content/catalogue.json',
    await prettier.format(JSON.stringify(catalogue), {
      ...config,
      parser: 'json',
    }),
  ],
  [
    'public/content/offline.json',
    await prettier.format(JSON.stringify(offline), {
      ...config,
      parser: 'json',
    }),
  ],
  ...generatedAssets.map((entry) => [
    'public/' + entry.descriptor.path,
    entry.text,
  ]),
];
const check = process.argv.includes('--check');
const assetDirectory = resolve(root, 'public/content/git-github');
const expectedNames = new Set(
  generatedAssets.map((entry) => entry.descriptor.path.split('/').at(-1)),
);
if (existsSync(assetDirectory)) {
  for (const name of readdirSync(assetDirectory)) {
    if (expectedNames.has(name)) continue;
    const path = resolve(assetDirectory, name);
    if (
      !/^(index|git-m0[1-7])\.[a-f0-9]{16}\.json$/.test(name) ||
      JSON.parse(readFileSync(path, 'utf8')).programmeId !== programmeId
    ) {
      throw new Error(
        'Unknown file in generated Git content directory: ' + name,
      );
    }
    if (check) throw new Error('Stale generated Git asset: ' + name);
    unlinkSync(path);
  }
}
for (const [path, text] of outputs) {
  const destination = resolve(root, path);
  if (check) {
    if (
      !existsSync(destination) ||
      readFileSync(destination, 'utf8') !== text
    ) {
      throw new Error('Stale or missing generated Git content: ' + path);
    }
  } else {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, text);
  }
}
console.log(
  JSON.stringify({
    check,
    sourceSha256,
    lessons: modules.reduce(
      (total, module) => total + module.missions.length,
      0,
    ),
    exercises: exercises.length,
    assets: outputs.slice(2).map(([path]) => path),
  }),
);
