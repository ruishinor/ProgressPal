// Programvareutvikling content export (Epic E, prompt §3 item 5).
//
// Authoring source (outside this repository)
//   → validated product export (this script)
//   → committed ProgressPal content: a small catalogue in the application
//     bundle and versioned, hash-named, same-origin static content assets
//     (owner decision 2026-10-03: curriculum leaves the JavaScript graph).
//
// The runtime never reads the authoring workspace. This script reads the
// Programme #2 sources at their recorded hashes, classifies every source
// field (reverse coverage: an unclassified field fails the export), drops
// study-only, authoring-only and analytics fields, moves authoring test
// vectors into a test fixture, fails on any study-only language, hashes every
// exported exercise canonically, and writes the catalogue, the content assets,
// their offline list, the evaluator vectors and the source ledger. Authored
// text is copied, never rewritten: no trim, no normalisation, no translation.
// The owner-approved checkpoint (K-4) and retry (K-3) rules are recorded as
// owner metadata, never as authored content.
//
//   node scripts/programvareutvikling-content.mjs --source "<workspace>"
//   node scripts/programvareutvikling-content.mjs --source "<workspace>" --check
//   ... --report <file.md>   also writes the field-disposition report

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'src/programmes/programvareutvikling/content');
const PUBLIC_DIR = join(ROOT, 'public');
/** Same-origin URL prefix (and public/ sub-folder) of the content assets. */
const ASSET_PREFIX = 'content/programvareutvikling';
const OFFLINE_LIST = 'content/offline.json';
const FIXTURE_DIR = join(ROOT, 'tests/fixtures/programvareutvikling');

/**
 * The authoritative product source: the Pre-E fit analysis's pilot, as
 * corrected at the source on 2026-10-03 (D-2 sentence, interleaved mission
 * sequences, and "Oppsettsklinikken" renamed "Feilsøking av oppsett").
 */
const EXPECTED_PILOT = {
  path: '05_OUTPUT/07_VERTICAL_SLICE/pilot.json',
  sha256: '5d6af68e7a417978e6aaf4389d9a99c2ae11be008a3a9ed6a9dda7c554b8cf5a',
  bytes: 1_121_780,
};
const SKILL_GRAPH_PATH = '05_OUTPUT/04_SKILL_GRAPH.json';
const STRUCTURE_PATH = '05_OUTPUT/06_SEMESTER_1_STRUCTURE.json';

const PROGRAMME_ID = 'programvareutvikling';
const CONTENT_VERSION = 2;
const EVALUATOR_CONTRACT_VERSION = 1;

/**
 * Study-only language the product must not carry (prompt §6). Bokmål forms
 * are matched as well; the bare word "deltaker" is not, because it also
 * occurs as ordinary task-domain vocabulary in two authored exercises.
 */
const STUDY_ONLY_PATTERNS = [
  /observatør/i,
  /\bobserver\b/i,
  /samtykke/i,
  /participant consent/i,
  /\bTrack [AB]\b/,
  /intervensjonsnivå|intervention level/i,
  /PRB-SET/,
  /study baseline|studiebaseline/i,
  /utprøvingsversjon/i,
  /Du får hjelp hvis du står fast/i,
  /counts_with_observer_verification/,
];

/**
 * Known source defects that the owner has not resolved. The export does not
 * edit around them: the text passes through unchanged and is recorded, and
 * the export fails if the defect disappears (so the record is removed) or
 * if any other study-only text appears. D-2 was corrected at the source
 * (owner authorization 2026-10-03), so none is open.
 */
const KNOWN_SOURCE_DEFECTS = [];

/**
 * Owner-approved rules (2026-10-03). They are owner decisions recorded as
 * content metadata so the application executes a named rule and never
 * invents one (schema record §3 invariant 9); the source authors neither.
 */
const OWNER_CHECKPOINT_RULE = {
  ruleId: 'owner-k4-2026-10-03',
  authority: 'owner decision K-4, 2026-10-03',
  criteria: 'every-gating-checkpoint-task',
  itemQualification: 'correct-unsupported-counting',
  passLevel: 'D',
};
const OWNER_GATE_RETRY_RULE = {
  ruleId: 'owner-k3-2026-10-03',
  authority: 'owner decision K-3, 2026-10-03',
  retryMode: 'same-task-new-attempt',
  presentation: 'deterministic-reshuffle',
  masteryAfterFailure: 'practised-from-that-task',
};

// ---------------------------------------------------------------- disposition
// Every source field is classified. "keep" ships in the runtime snapshot,
// "index" ships only as derived metadata in the manifest, "vector" moves to
// the evaluator test fixture, the "exclude:*" classes never ship.

const MODULE_FIELDS = {
  module_id: 'index',
  title_nb: 'index',
  missions: 'index',
  units: 'keep',
};
const MISSION_FIELDS = {
  mission_id: 'index',
  surface: 'index',
  title: 'index',
  goal: 'index',
  unit_ids: 'index',
  minutes: 'index',
  optional_minutes: 'index',
  phases: 'index',
  sequence: 'index',
};
const SEQUENCE_FIELDS = {
  unit_id: 'index',
  from: 'index',
  to: 'index',
  note: 'index',
};
const PHASE_FIELDS = {
  phase_id: 'index',
  title: 'index',
  parts: 'index',
  minutes: 'index',
};
const PART_FIELDS = {
  unit_id: 'index',
  exercises_from: 'index',
  exercises_to: 'index',
};
const UNIT_FIELDS = {
  unit_id: 'keep',
  kind: 'keep',
  title_nb: 'keep',
  goal_nb: 'keep',
  optional: 'keep',
  mission: 'keep',
  flow: 'keep',
  module_id: 'index',
  sequence: 'index',
  teaches: 'index',
  practises: 'index',
  models: 'index',
  retrieves: 'index',
  retrieval_refs: 'index',
  prerequisite_skill_ids: 'index',
  title_en: 'exclude:authoring',
  scaffold_level: 'exclude:authoring',
  instruction_mode: 'exclude:authoring',
  env_time: 'exclude:authoring',
  time_extra: 'exclude:authoring',
  time: 'exclude:authoring',
  extra_knowledge_ids: 'exclude:authoring',
  external_fact_refs: 'exclude:authoring',
  objective_ids: 'exclude:authoring',
  knowledge_ids: 'exclude:authoring',
  exercise_ids: 'exclude:authoring',
  source_refs: 'exclude:authoring',
};
const BLOCK_FIELDS = {
  orient: { t: 'keep', nb: 'keep' },
  text: { t: 'keep', nb: 'keep' },
  callout: { t: 'keep', kind: 'keep', nb: 'keep' },
  terminal: {
    t: 'keep',
    session: 'keep',
    nb: 'keep',
    source: 'keep',
    _status: 'exclude:authoring',
  },
  code: {
    t: 'keep',
    file: 'keep',
    code: 'keep',
    stdin: 'keep',
    stdout: 'keep',
    error: 'keep',
    error_info: 'keep',
    nb: 'keep',
  },
  table: { t: 'keep', columns: 'keep', rows: 'keep', nb: 'keep' },
  recap: { t: 'keep', can: 'keep', next: 'keep' },
  worked: { t: 'keep', title: 'keep', steps: 'keep' },
  'doc-terminal': {
    t: 'keep',
    text: 'keep',
    source: 'keep',
    nb: 'keep',
    unverified: 'keep',
  },
  error: {
    t: 'keep',
    file: 'keep',
    code: 'keep',
    stdin: 'keep',
    terminal: 'keep',
    err_type: 'keep',
    err_line: 'keep',
    err_message: 'keep',
    err_last: 'keep',
    nb: 'keep',
    _raw_stderr: 'exclude:authoring',
  },
};
const NESTED_KEEP = {
  'terminal.session[]': ['prompt', 'cmd', 'out', 'status', 'hidden'],
  'worked.steps[]': ['say', 'code', 'file', 'stdout', 'error', 'session'],
  'worked.steps[].session[]': ['prompt', 'cmd', 'out', 'status', 'hidden'],
  'code.error_info': ['type', 'message', 'line', 'last'],
};
const EXERCISE_FIELDS = {
  t: 'keep',
  id: 'keep',
  type: 'keep',
  role: 'keep',
  activity: 'keep',
  optional: 'keep',
  evaluable: 'keep',
  evidence_trust: 'keep',
  evidence_layer: 'keep',
  prompt: 'keep',
  hints: 'keep',
  feedback: 'keep',
  checkpoint_task: 'keep',
  how: 'keep',
  evaluator: 'keep',
  unit: 'keep',
  required_practice: 'keep',
  mastery_gate: 'keep',
  skill_ids: 'keep',
  response_mode: 'keep',
  code: 'keep',
  code_lang: 'keep',
  multi: 'keep',
  options: 'keep',
  kind: 'keep',
  categories: 'keep',
  items: 'keep',
  items_feedback: 'keep',
  distractors: 'keep',
  context: 'keep',
  layout: 'keep',
  canonical: 'keep',
  effect: 'keep',
  file: 'keep',
  stdin: 'keep',
  expected_lines: 'keep',
  traps: 'keep',
  explain_output: 'keep',
  template: 'keep',
  expected_output: 'keep',
  blanks: 'keep',
  starter: 'keep',
  reads_input: 'keep',
  compare: 'keep',
  broken_run: 'keep',
  structure: 'keep',
  forbid: 'keep',
  examples: 'keep',
  choices: 'keep',
  slots: 'keep',
  terminal: 'keep',
  err: 'keep',
  type_options: 'keep',
  cause_options: 'keep',
  fix: 'keep',
  vars: 'keep',
  table: 'keep',
  fields: 'keep',
  min_rows: 'keep',
  coverage: 'keep',
  reference: 'keep-testtable-else-vector',
  solution: 'vector',
  good_rows: 'vector',
  bad_row_sets: 'vector',
  skills: 'exclude:duplicate',
  exercise_id: 'exclude:duplicate',
  assessment_role: 'exclude:duplicate',
  d: 'exclude:authoring',
  difficulty: 'exclude:authoring',
  objective_ids: 'exclude:authoring',
  expected_evidence: 'exclude:authoring',
  _time: 'exclude:authoring',
  scaffold: 'exclude:authoring',
  retry: 'exclude:authoring',
  misconception_tags: 'exclude:analytics',
  reward: 'index',
  counts_with_observer_verification: 'exclude:study',
};
const EVALUATOR_FIELDS = {
  mode: 'keep',
  correct: 'keep',
  shuffle: 'keep',
  expected: 'keep',
  keyboard_alternative: 'keep',
  pairs: 'keep',
  distractors: 'keep',
  blanks: 'keep',
  expected_output: 'keep',
  normalize: 'keep',
  columns: 'keep',
  blank_marker: 'keep',
  accept: 'keep',
  flags: 'keep',
  near_misses: 'keep',
  pattern: 'keep',
  diagnostics: 'keep',
  privacy: 'keep',
  compare: 'keep',
  timeout_s: 'keep',
  tests: 'keep',
  structure_checks: 'keep',
  forbidden_patterns: 'keep',
  failure_signatures: 'keep',
  unseen_policy: 'keep',
  numeric_values_compared_as_numbers: 'keep',
  reference_executed: 'keep',
  min_rows: 'keep',
  coverage: 'keep',
  mastery_gate: 'keep',
  examples_ok: 'vector',
  examples_bad: 'vector',
  expected_source: 'exclude:authoring',
  executed_check: 'exclude:authoring',
  note: 'exclude:authoring',
  trust: 'exclude:authoring',
  verify: 'exclude:authoring',
  bad_examples_detected: 'exclude:authoring',
};
const FAILURE_SIGNATURE_FIELDS = {
  signature: 'keep',
  feedback: 'keep',
  name: 'vector',
  code: 'vector',
};
const TOP_FIELDS = {
  schema: 'index',
  version: 'index',
  status: 'index',
  language: 'index',
  generated_with: 'exclude:authoring',
  unverified_transcripts: 'exclude:authoring',
  reward_events: 'index',
  modules: 'keep',
};

const disposition = new Map();
function classify(path, field, table) {
  const cls = table[field];
  if (cls === undefined) {
    fail(`unclassified source field "${field}" at ${path}`);
  }
  disposition.set(`${path}.${field}`, cls);
  return cls;
}

// ---------------------------------------------------------------- helpers
const failures = [];
function fail(message) {
  failures.push(message);
}

function sha256(bufferOrText) {
  return createHash('sha256').update(bufferOrText).digest('hex');
}

/** Must stay identical to `canonicalJson` in src/lib/domain/learnerEvidence.ts. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  const members = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${members.join(',')}}`;
}

function stringLeaves(value, path = '$') {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value))
    return value.flatMap((entry, index) =>
      stringLeaves(entry, `${path}[${index}]`),
    );
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      stringLeaves(entry, `${path}.${key}`),
    );
  }
  return [];
}

function pick(source, fields) {
  const out = {};
  for (const field of fields) {
    if (Object.hasOwn(source, field)) out[field] = source[field];
  }
  return out;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

// ---------------------------------------------------------------- read source
const sourceRoot = argValue('--source');
if (sourceRoot === null) {
  console.error(
    'Usage: node scripts/programvareutvikling-content.mjs --source "<Programvareutvikling workspace>" [--check] [--report <file>]',
  );
  process.exit(2);
}

const pilotBytes = readFileSync(join(sourceRoot, EXPECTED_PILOT.path));
const pilotSha = sha256(pilotBytes);
if (
  pilotSha !== EXPECTED_PILOT.sha256 ||
  pilotBytes.length !== EXPECTED_PILOT.bytes
) {
  console.error(
    `pilot.json is ${pilotSha} (${pilotBytes.length} bytes), expected ${EXPECTED_PILOT.sha256} (${EXPECTED_PILOT.bytes}). The source moved: reconcile the delta and re-derive the counts before exporting.`,
  );
  process.exit(1);
}
const skillGraphBytes = readFileSync(join(sourceRoot, SKILL_GRAPH_PATH));
const structureBytes = readFileSync(join(sourceRoot, STRUCTURE_PATH));
const pilot = JSON.parse(pilotBytes.toString('utf8'));
const skillGraph = JSON.parse(skillGraphBytes.toString('utf8'));
const structure = JSON.parse(structureBytes.toString('utf8'));

for (const field of Object.keys(pilot)) classify('$', field, TOP_FIELDS);

// ---------------------------------------------------------------- export units
const vectors = {};
const exerciseIndex = [];
const unitIndex = [];
const moduleFiles = [];
const ledgerUnits = [];
const unitMission = new Map();
let exerciseOrder = 0;

function exportBlock(block, path) {
  const table = BLOCK_FIELDS[block.t];
  if (table === undefined) {
    fail(`unknown block kind "${block.t}" at ${path}`);
    return null;
  }
  const keep = [];
  for (const field of Object.keys(block)) {
    if (classify(`block:${block.t}`, field, table) === 'keep') keep.push(field);
  }
  const out = pick(block, keep);
  for (const [nestedPath, allowed] of Object.entries(NESTED_KEEP)) {
    const [kind, ...rest] = nestedPath.split('.');
    if (kind !== block.t) continue;
    const walk = (value, segments) => {
      if (segments.length === 0) {
        for (const entry of [value].flat()) {
          if (entry && typeof entry === 'object') {
            for (const key of Object.keys(entry)) {
              if (!allowed.includes(key))
                fail(
                  `unclassified nested field "${key}" at ${path}.${nestedPath}`,
                );
            }
          }
        }
        return;
      }
      const [head, ...tail] = segments;
      const name = head.replace('[]', '');
      const next = value?.[name];
      if (next === undefined || next === null) return;
      if (head.endsWith('[]')) next.forEach((entry) => walk(entry, tail));
      else walk(next, tail);
    };
    walk(block, rest);
  }
  return out;
}

function exportEvaluator(evaluator, exerciseId) {
  const out = {};
  for (const field of Object.keys(evaluator)) {
    const cls = classify('evaluator', field, EVALUATOR_FIELDS);
    if (cls === 'keep') {
      out[field] = evaluator[field];
    } else if (cls === 'vector') {
      (vectors[exerciseId] ??= {})[field] = evaluator[field];
    }
  }
  if (Array.isArray(evaluator.failure_signatures)) {
    out.failure_signatures = evaluator.failure_signatures.map((signature) => {
      const kept = {};
      for (const field of Object.keys(signature)) {
        if (
          classify(
            'evaluator.failure_signatures[]',
            field,
            FAILURE_SIGNATURE_FIELDS,
          ) === 'keep'
        ) {
          kept[field] = signature[field];
        }
      }
      return kept;
    });
    if (evaluator.failure_signatures.length > 0) {
      (vectors[exerciseId] ??= {}).failure_variants =
        evaluator.failure_signatures.map((signature) => ({
          name: signature.name,
          code: signature.code,
          signature: signature.signature,
        }));
    }
  }
  return out;
}

function exportExercise(exercise) {
  const out = {};
  for (const field of Object.keys(exercise)) {
    let cls = classify('exercise', field, EXERCISE_FIELDS);
    if (cls === 'keep-testtable-else-vector')
      cls = exercise.type === 'testtable' ? 'keep' : 'vector';
    if (cls === 'keep') {
      out[field] =
        field === 'evaluator'
          ? exportEvaluator(exercise.evaluator, exercise.id)
          : exercise[field];
    } else if (cls === 'vector') {
      (vectors[exercise.id] ??= {})[field] = exercise[field];
    }
  }
  if (exercise.id !== exercise.exercise_id)
    fail(`exercise id mismatch ${exercise.id}`);
  if (canonicalJson(exercise.skills) !== canonicalJson(exercise.skill_ids))
    fail(`skills/skill_ids differ on ${exercise.id}`);
  if (exercise.role !== exercise.assessment_role)
    fail(`role/assessment_role differ on ${exercise.id}`);
  if (exercise.retry !== null || exercise.scaffold !== null)
    fail(`unexpected retry or scaffold on ${exercise.id}`);
  return out;
}

const RUNTIME_MODES = new Set(['program', 'test-table']);

for (const [moduleIndex, module] of pilot.modules.entries()) {
  for (const field of Object.keys(module))
    classify('module', field, MODULE_FIELDS);
  for (const mission of module.missions) {
    for (const field of Object.keys(mission))
      classify('mission', field, MISSION_FIELDS);
    for (const segment of mission.sequence ?? [])
      for (const field of Object.keys(segment))
        classify('mission.sequence[]', field, SEQUENCE_FIELDS);
    for (const phase of mission.phases ?? []) {
      for (const field of Object.keys(phase))
        classify('phase', field, PHASE_FIELDS);
      for (const part of phase.parts)
        for (const field of Object.keys(part))
          classify('phase.part', field, PART_FIELDS);
    }
    for (const unitId of mission.unit_ids)
      unitMission.set(unitId, mission.mission_id);
  }

  const units = [];
  for (const [unitPosition, unit] of module.units.entries()) {
    const keep = [];
    for (const field of Object.keys(unit)) {
      if (classify('unit', field, UNIT_FIELDS) === 'keep') keep.push(field);
    }
    const runtimeUnit = pick(unit, keep);
    runtimeUnit.flow = unit.flow.map((block, blockIndex) =>
      block.t === 'exercise'
        ? exportExercise(block)
        : exportBlock(
            block,
            `$.modules[${moduleIndex}].units[${unitPosition}].flow[${blockIndex}]`,
          ),
    );
    units.push(runtimeUnit);

    // Ledger from the raw source values (independent of the copy above):
    // every string leaf under a field the disposition ships.
    const sourceLeaves = stringLeaves(unit).filter(([path]) =>
      shipsAtPath(unit, path),
    );
    sourceLeaves.sort(([a], [b]) => a.localeCompare(b));
    ledgerUnits.push({
      unitId: unit.unit_id,
      stringCount: sourceLeaves.length,
      sha256: sha256(JSON.stringify(sourceLeaves)),
    });

    const missionId = unitMission.get(unit.unit_id);
    if (missionId === undefined)
      fail(`unit ${unit.unit_id} belongs to no mission`);
    if (unit.mission !== missionId)
      fail(
        `unit ${unit.unit_id} mission field differs from the mission that lists it`,
      );
    unitIndex.push({
      unitId: unit.unit_id,
      kind: unit.kind,
      missionId,
      moduleId: module.module_id,
      optional: unit.optional,
      teaches: unit.teaches,
      practises: unit.practises,
      models: unit.models,
      retrieves: unit.retrieves ?? [],
    });

    for (const exported of runtimeUnit.flow.filter(
      (block) => block.t === 'exercise',
    )) {
      const source = unit.flow.find((block) => block.id === exported.id);
      exerciseIndex.push({
        exerciseId: exported.id,
        subjectId: exported.id.toLowerCase(),
        moduleId: module.module_id,
        missionId,
        unitId: unit.unit_id,
        unitKind: unit.kind,
        order: exerciseOrder++,
        responseMode: exported.response_mode,
        evaluatorMode: exported.evaluator.mode,
        role: exported.role,
        activity: exported.activity,
        optional: exported.optional,
        evaluable: exported.evaluable,
        requiredPractice: exported.required_practice,
        masteryGate: exported.mastery_gate,
        evidenceTrust: exported.evidence_trust,
        evidenceLayer: exported.evidence_layer,
        checkpointTask: exported.checkpoint_task,
        skillIds: exported.skill_ids,
        needsRuntime: RUNTIME_MODES.has(exported.evaluator.mode),
        hintCount: exported.hints.length,
        rewardEventId: source?.reward?.id ?? null,
        contentHash: sha256(canonicalJson(exported)),
      });
    }
  }

  moduleFiles.push({
    fileName: `${module.module_id.toLowerCase()}.json`,
    json: {
      format: 'progresspal-programme-lessons',
      formatVersion: 1,
      programmeId: PROGRAMME_ID,
      moduleId: module.module_id,
      contentVersion: CONTENT_VERSION,
      evaluatorContractVersion: EVALUATOR_CONTRACT_VERSION,
      sourceSha256: pilotSha,
      units,
    },
  });
}

/** True when the source field at `path` (relative to a unit) ships in the runtime unit. */
function shipsAtPath(unit, path) {
  const parts = path.match(/\.[^.[\]]+|\[\d+\]/g) ?? [];
  const field = parts[0]?.slice(1);
  if (UNIT_FIELDS[field] !== 'keep') return false;
  if (field !== 'flow') return true;
  const block = unit.flow[Number(parts[1].slice(1, -1))];
  const blockField = parts[2]?.slice(1);
  if (block.t !== 'exercise') {
    return BLOCK_FIELDS[block.t]?.[blockField] === 'keep';
  }
  let cls = EXERCISE_FIELDS[blockField];
  if (cls === 'keep-testtable-else-vector')
    cls = block.type === 'testtable' ? 'keep' : 'vector';
  if (cls !== 'keep') return false;
  if (blockField !== 'evaluator') return true;
  const evaluatorField = parts[3]?.slice(1);
  if (EVALUATOR_FIELDS[evaluatorField] !== 'keep') return false;
  if (evaluatorField !== 'failure_signatures') return true;
  return FAILURE_SIGNATURE_FIELDS[parts[5]?.slice(1)] === 'keep';
}

// ---------------------------------------------------------------- missions, modules, skills
const missionLedger = [];
const missionsById = new Map();
const modulesIndex = pilot.modules.map((module, moduleOrder) => {
  const structureModule = structure.modules.find(
    (entry) => entry.module_id === module.module_id,
  );
  if (!structureModule)
    fail(`module ${module.module_id} missing from the semester structure`);
  const checkpointMission = module.missions.find(
    (mission) => mission.surface === 'checkpoint',
  );
  const checkpoint = structureModule?.checkpoint ?? {};

  return {
    moduleId: module.module_id,
    catalogueUnitId: module.module_id.toLowerCase(),
    title: module.title_nb,
    order: moduleOrder,
    checkpoint: {
      missionId: checkpointMission?.mission_id ?? null,
      criticalGateSkillIds: checkpoint.critical_gate_skill_ids ?? [],
      tasks: (checkpoint.tasks ?? []).map((task) => ({
        key: task.key,
        kind: task.kind,
        skillIds: task.skill_ids,
        gatingLayer: task.gating_layer,
        gating: task.gating,
      })),
    },
    missions: module.missions.map((mission, missionOrder) => {
      const entry = {
        missionId: mission.mission_id,
        itemId: mission.mission_id.toLowerCase(),
        surface: mission.surface,
        title: mission.title,
        goal: mission.goal,
        minutes: mission.minutes,
        ...(mission.optional_minutes === undefined
          ? {}
          : { optionalMinutes: mission.optional_minutes }),
        optional: mission.unit_ids.every(
          (unitId) =>
            module.units.find((unit) => unit.unit_id === unitId)?.optional ===
            true,
        ),
        order: missionOrder,
        unitIds: mission.unit_ids,
        ...(mission.sequence
          ? {
              sequence: mission.sequence.map((segment) => ({
                unitId: segment.unit_id,
                from: segment.from,
                to: segment.to,
                ...(segment.note === undefined ? {} : { note: segment.note }),
              })),
            }
          : {}),
        ...(mission.phases
          ? {
              phases: mission.phases.map((phase) => ({
                phaseId: phase.phase_id,
                title: phase.title,
                minutes: phase.minutes,
                parts: phase.parts.map((part) => ({
                  unitId: part.unit_id,
                  ...(part.exercises_from === undefined
                    ? {}
                    : { exercisesFrom: part.exercises_from }),
                  ...(part.exercises_to === undefined
                    ? {}
                    : { exercisesTo: part.exercises_to }),
                })),
              })),
            }
          : {}),
      };
      missionsById.set(entry.missionId, entry);
      const leaves = [
        ['title', mission.title],
        ['goal', mission.goal],
        ...(mission.phases ?? []).map((phase, index) => [
          `phases[${index}].title`,
          phase.title,
        ]),
      ];
      missionLedger.push({
        missionId: mission.mission_id,
        sha256: sha256(JSON.stringify(leaves)),
      });
      return entry;
    }),
  };
});

const usedSkillIds = new Set([
  ...exerciseIndex.flatMap((entry) => entry.skillIds),
  ...unitIndex.flatMap((entry) => [
    ...entry.teaches,
    ...entry.practises,
    ...entry.models,
    ...entry.retrieves,
  ]),
  ...modulesIndex.flatMap((module) => [
    ...module.checkpoint.criticalGateSkillIds,
    ...module.checkpoint.tasks.flatMap((task) => task.skillIds),
  ]),
]);
const skillsById = new Map(
  skillGraph.skills.map((skill) => [skill.skill_id, skill]),
);
const introducingMission = (skillId) =>
  unitIndex.find((unit) => unit.teaches.includes(skillId))?.missionId ?? null;
const skills = [...usedSkillIds].sort().map((skillId) => {
  const skill = skillsById.get(skillId);
  if (!skill) {
    fail(`skill ${skillId} is referenced but not in the skill graph`);
    return null;
  }
  return {
    skillId,
    gatingRole: skill.gating_role,
    prerequisiteSkillIds: skill.prerequisite_skill_ids,
    introducedInModule: skill.introduced_in_module,
    introducingMissionId: introducingMission(skillId),
    stateTargetModule: skill.state_target_module,
    retention: {
      target: skill.retention.target,
      gate: skill.retention.gate,
      opportunityUnits: skill.retention.opportunity_units,
    },
    integrationTarget: skill.integration_target,
  };
});

// ---------------------------------------------------------------- sanitation
const runtimeJson = [moduleFiles.map((file) => file.json), modulesIndex];
const studyHits = runtimeJson
  .flatMap((json) => stringLeaves(json))
  .filter(([, text]) =>
    STUDY_ONLY_PATTERNS.some((pattern) => pattern.test(text)),
  );
const exercisesById = new Map(
  moduleFiles
    .flatMap((file) => file.json.units.flatMap((unit) => unit.flow))
    .filter((block) => block.t === 'exercise')
    .map((exercise) => [exercise.id, exercise]),
);
for (const defect of KNOWN_SOURCE_DEFECTS) {
  const value = exercisesById.get(defect.exerciseId)?.[defect.field];
  if (typeof value !== 'string' || !value.includes(defect.text)) {
    fail(
      `known source defect ${defect.id} is no longer present: remove it from KNOWN_SOURCE_DEFECTS and re-run`,
    );
  }
}
for (const [path, text] of studyHits) {
  const known = KNOWN_SOURCE_DEFECTS.some(
    (defect) => exercisesById.get(defect.exerciseId)?.[defect.field] === text,
  );
  if (!known) fail(`study-only language at ${path}: ${text.slice(0, 120)}`);
}
for (const [path, text] of runtimeJson.flatMap((json) => stringLeaves(json))) {
  if (/https?:\/\//i.test(text)) fail(`URL in exported content at ${path}`);
}
// Authored reward events (behaviours worth celebrating) must agree with the
// exercise-level rewards they were derived from.
const rewardIds = exerciseIndex.filter((entry) => entry.rewardEventId !== null);
if (rewardIds.length !== pilot.reward_events.length)
  fail(
    `${rewardIds.length} rewarded exercises, ${pilot.reward_events.length} authored reward events`,
  );
for (const event of pilot.reward_events) {
  if (
    exerciseIndex.find((entry) => entry.exerciseId === event.exercise_id)
      ?.rewardEventId !== event.event_id
  )
    fail(`reward event ${event.event_id} does not match ${event.exercise_id}`);
}

// ---------------------------------------------------------------- counts
const counts = {
  modules: modulesIndex.length,
  missions: modulesIndex.reduce(
    (total, module) => total + module.missions.length,
    0,
  ),
  units: unitIndex.length,
  exercises: exerciseIndex.length,
  evaluable: exerciseIndex.filter((entry) => entry.evaluable).length,
  needsRuntime: exerciseIndex.filter((entry) => entry.needsRuntime).length,
  masteryGate: exerciseIndex.filter((entry) => entry.masteryGate).length,
  hints: exerciseIndex.reduce((total, entry) => total + entry.hintCount, 0),
};
const expectedCounts = {
  modules: 2,
  missions: 25,
  units: 47,
  exercises: 291,
  evaluable: 276,
  needsRuntime: 49,
  masteryGate: 25,
  hints: 245,
};
for (const [key, value] of Object.entries(expectedCounts)) {
  if (counts[key] !== value)
    fail(`count ${key} is ${counts[key]}, expected ${value}`);
}
for (const module of modulesIndex) {
  for (const mission of module.missions) {
    if (mission.optional !== (mission.surface === 'reinforcement'))
      fail(`optional flag of ${mission.missionId} disagrees with its surface`);
  }
}

if (failures.length > 0) {
  console.error(
    `Export failed (${failures.length}):\n- ${failures.join('\n- ')}`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------- outputs
const manifest = {
  format: 'progresspal-programme-content',
  formatVersion: 1,
  programmeId: PROGRAMME_ID,
  contentVersion: CONTENT_VERSION,
  evaluatorContractVersion: EVALUATOR_CONTRACT_VERSION,
  language: 'nb',
  technicalLanguage: 'en',
  source: {
    artefact: EXPECTED_PILOT.path,
    schema: pilot.schema,
    schemaVersion: pilot.version,
    sha256: pilotSha,
    bytes: pilotBytes.length,
    status: pilot.status,
    skillGraphSha256: sha256(skillGraphBytes),
    structureSha256: sha256(structureBytes),
    knownSourceDefects: KNOWN_SOURCE_DEFECTS.map(
      ({ id, exerciseId, field, stopState }) => ({
        id,
        exerciseId,
        field,
        stopState,
      }),
    ),
  },
  checkpointRules: [OWNER_CHECKPOINT_RULE],
  gateRetryRule: OWNER_GATE_RETRY_RULE,
  modules: modulesIndex,
  units: unitIndex,
  skills,
  exercises: exerciseIndex,
};

/** Minified, byte-stable asset text and its content-addressed public path. */
function asset(stem, json) {
  const text = `${JSON.stringify(json)}\n`;
  const sha = sha256(text);
  return {
    text,
    sha256: sha,
    bytes: Buffer.byteLength(text),
    path: `${ASSET_PREFIX}/${stem}.${sha.slice(0, 16)}.json`,
  };
}
const indexAsset = asset('index', manifest);
const moduleAssets = moduleFiles.map((file) => ({
  moduleId: file.json.moduleId,
  ...asset(file.fileName.replace(/\.json$/, ''), file.json),
}));
const describeAsset = ({ path, sha256: sha, bytes }) => ({
  path,
  sha256: sha,
  bytes,
});

/**
 * The bundled catalogue: identity, the catalogue rows the registry needs
 * synchronously, every exercise subject ID (collision checks) and the
 * content-addressed assets the provider loads and verifies.
 */
const catalogue = {
  format: 'progresspal-programme-catalogue',
  formatVersion: 1,
  programmeId: PROGRAMME_ID,
  contentVersion: CONTENT_VERSION,
  evaluatorContractVersion: EVALUATOR_CONTRACT_VERSION,
  language: manifest.language,
  technicalLanguage: manifest.technicalLanguage,
  sourceSha256: pilotSha,
  modules: modulesIndex.map((module) => ({
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
      ...(mission.optionalMinutes === undefined
        ? {}
        : { optionalMinutes: mission.optionalMinutes }),
      optional: mission.optional,
      order: mission.order,
    })),
  })),
  subjectIds: exerciseIndex.map((entry) => entry.subjectId),
  assets: {
    index: describeAsset(indexAsset),
    modules: Object.fromEntries(
      moduleAssets.map((entry) => [entry.moduleId, describeAsset(entry)]),
    ),
  },
};

/** Every content asset, for the service worker's install-time cache. */
const offlineList = {
  format: 'progresspal-offline-content',
  formatVersion: 1,
  assets: [indexAsset, ...moduleAssets].map((entry) => `/${entry.path}`),
};

const rawOutputs = [
  [join(PUBLIC_DIR, indexAsset.path), indexAsset.text],
  ...moduleAssets.map((entry) => [join(PUBLIC_DIR, entry.path), entry.text]),
];

const outputs = [
  [join(CONTENT_DIR, 'catalogue.json'), catalogue],
  [join(PUBLIC_DIR, OFFLINE_LIST), offlineList],
  [
    join(FIXTURE_DIR, 'evaluator-vectors.json'),
    {
      sourceSha256: pilotSha,
      contentVersion: CONTENT_VERSION,
      exercises: vectors,
    },
  ],
  [
    join(FIXTURE_DIR, 'source-ledger.json'),
    {
      sourceSha256: pilotSha,
      contentVersion: CONTENT_VERSION,
      units: ledgerUnits,
      missions: missionLedger,
    },
  ],
];

const prettierConfig =
  (await prettier.resolveConfig(join(ROOT, 'package.json'))) ?? {};
const check = process.argv.includes('--check');
const stale = [];

const formatted = [];
for (const [file, json] of outputs) {
  formatted.push([
    file,
    await prettier.format(JSON.stringify(json), {
      ...prettierConfig,
      parser: 'json',
    }),
  ]);
}
const assetDir = join(PUBLIC_DIR, ASSET_PREFIX);
const expectedAssets = new Set(rawOutputs.map(([file]) => resolve(file)));
const presentAssets = existsSync(assetDir)
  ? readdirSync(assetDir).map((name) => resolve(join(assetDir, name)))
  : [];
for (const [file, text] of [...formatted, ...rawOutputs]) {
  if (check) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== text)
      stale.push(file);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
}
for (const file of presentAssets) {
  if (expectedAssets.has(file)) continue;
  if (check) stale.push(`${file} (not produced by this export)`);
  else rmSync(file);
}
for (const legacy of ['manifest.json', 's1-m01.json', 's1-m02.json']) {
  const file = join(CONTENT_DIR, legacy);
  if (!existsSync(file)) continue;
  if (check) stale.push(`${file} (superseded by the content assets)`);
  else rmSync(file);
}

const reportPath = argValue('--report');
if (reportPath !== null) {
  const rows = [...disposition.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  writeFileSync(
    reportPath,
    `# Programvareutvikling field disposition\n\nSource ${EXPECTED_PILOT.path} SHA-256 ${pilotSha}; content version ${CONTENT_VERSION}.\n\n| Source field | Disposition |\n| --- | --- |\n${rows.map(([field, cls]) => `| \`${field}\` | ${cls} |`).join('\n')}\n\nCounts: ${JSON.stringify(counts)}\n`,
  );
}

if (check) {
  if (stale.length > 0) {
    console.error(
      `Committed export differs from a fresh export of the source:\n- ${stale.join('\n- ')}`,
    );
    process.exit(1);
  }
  console.log(
    `Export check passed: ${outputs.length + rawOutputs.length} files match a fresh export of ${EXPECTED_PILOT.path} (${pilotSha}). Counts ${JSON.stringify(counts)}.`,
  );
} else {
  console.log(
    `Exported ${outputs.length + rawOutputs.length} files from ${EXPECTED_PILOT.path} (${pilotSha}). Counts ${JSON.stringify(counts)}.`,
  );
}
