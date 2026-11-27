/**
 * Release size budgets. Application JavaScript and CSS are budgeted as
 * before. Two separately counted classes exist since the Epic E owner
 * decision of 2026-10-03: the packaged curriculum (versioned same-origin
 * content assets under `content/`) and the pinned client-side Python runtime
 * (under `runtime/`). Nothing is hidden: every built file is classified, and
 * an unexpected file type in either class is itself a violation.
 */
export const releaseBundleBudget = Object.freeze({
  // Owner-authorized raise (2026-10-03: at most 14,000 B after one measured
  // dedupe pass). The pass took 12,004 B to 11,969 B; the bounded lesson
  // hierarchy rules then measured 12,008 B, so the bound was 12,500 B (about
  // 4 % headroom).
  // Recalibrated to 13,250 B (owner decision, 2026-10-05) for the accepted
  // microlearning surface. It measured 12,704 B after two consolidation
  // passes (rpg-button, the RPG tokens and shared flex rules reused; no rule
  // dropped that a physical device test had validated), and 13,250 B keeps
  // about the same 4 % headroom over that new baseline.
  // Owner policy of 2026-10-18 supersedes that tight ceiling. Both CSS levels
  // are the total gzip bytes of every built .css file (the same measurement
  // as before; decimal kB): above the warning level the report says so and
  // the check still passes; above the provisional hard ceiling it fails, and
  // only an owner decision may move it. It measured 13,250 B at the change.
  cssGzipWarningBytes: 25_000,
  maxCssGzipBytes: 40_000,
  // Owner-authorized raise (2026-10-21, ACT 18 integration): the 18 Scrum,
  // Kanban and Smidig samarbeid activities ship as static content in their
  // own chunk (`content-utviklerblikk`, 115,929 B raw, 33,399 B gzip,
  // measured), plus 285 B for the two renderer adaptations. Total JavaScript
  // went from 395,514 B to 429,198 B; the limit moves by that addition and
  // keeps the earlier headroom of about 5 kB.
  // Owner-authorized Activity ceiling (2026-10-25), after one focused pass.
  // Initial Activity build: 438,135 B; final measurement: docs/ACTIVITY_HANDOFF.md.
  // Owner-authorized security preparation (2026-10-26): Zod 4.6.6 plus
  // fail-fast backup validation measured 447,162 B after one overhead check.
  // Previous consolidated UI build: 439,727 B. Other limits are unchanged.
  // Owner-authorized combined UX/UU + SQL/MySQL + Activity integration
  // (2026-10-27): measured 459,055 B, ceiling 465,000 B. Other limits unchanged.
  // Owner decision (2026-10-28): approved educational-content expansion after
  // one bounded investigation; measured candidate 467,691 B gzip. Previous
  // ceiling 465,000 B; new ceiling 470,000 B. All other thresholds unchanged.
  // Owner decision (2026-11-27): retain the Git visual-learning upgrade.
  // Candidate measured 474,996 B gzip; 485,000 B allows 2.1% headroom.
  // Only this limit changes; the hard gate and other asset budgets remain.
  // Consolidated teaching upgrade (2026-11-28): 494,862 B measured.
  // Retain a hard ceiling with about 2% headroom for the visual and editorial work.
  maxJavaScriptGzipBytes: 505_000,
  maxJavaScriptRawBytes: 500_000,
  // Owner-authorized M02 expansion (2026-11-05): 152002 B curriculum gzip measured; prior ceiling 150000 B.
  // New ceiling 157000 B includes bounded headroom.
  // M04 measured 181,948 B curriculum gzip (2026-11-05); 4,052 B headroom.
  // Only this content budget is raised; JS, CSS and runtime caps stay unchanged.
  // M05 measured 199367 B curriculum gzip on this candidate.
  // Raised from 186,000 B with approximately 2.5% measured headroom, rounded to 1 kB.
  // M06 measured 212628 B curriculum gzip (2026-11-06).
  // Bounded 2.5% headroom, rounded to 1 kB; other caps unchanged.
  // M07 measured 232460 B curriculum gzip; bounded 2.5% headroom, rounded up to 1 kB.
  // Autumn curriculum expansion, 2026-11-10:
  // Measured 265822 B gzip for the combined packaged curriculum.
  // Ceiling 273000 B retains approximately 2.7% headroom.
  // Consolidated teaching upgrade (2026-11-28): 278,894 B measured,
  // including 12,785 B of new M01/M02 visual assets. About 2% headroom.
  maxCurriculumGzipBytes: 285000,
  // The pinned Pyodide 314.0.7 runtime measured 6,398,912 bytes gzip (five
  // packaged files plus the runtime list); about 9.4 % headroom, within the
  // owner-authorized ~10 % (decision 2026-10-03).
  maxRuntimeAssetGzipBytes: 7_000_000,
});

/** The budget class of a built file, by its path relative to `dist/`. */
export function classifyBuildFile(distRelativePath) {
  const path = distRelativePath.replaceAll('\\', '/');
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();

  if (path.startsWith('content/')) {
    return extension === '.json' ? 'curriculum' : 'unexpected';
  }

  if (path.startsWith('runtime/')) {
    return ['.mjs', '.wasm', '.zip', '.json'].includes(extension)
      ? 'runtime'
      : 'unexpected';
  }

  if (extension === '.js' || extension === '.mjs') {
    return 'js';
  }

  if (extension === '.css') {
    return 'css';
  }

  return null;
}

export function evaluateBundleBudget(entries, budget = releaseBundleBudget) {
  const javaScriptEntries = entries.filter((entry) => entry.kind === 'js');
  const cssEntries = entries.filter((entry) => entry.kind === 'css');
  const sum = (kind) =>
    entries
      .filter((entry) => entry.kind === kind)
      .reduce((total, entry) => total + entry.gzipBytes, 0);
  const largestJavaScriptRawBytes = Math.max(
    0,
    ...javaScriptEntries.map((entry) => entry.rawBytes),
  );
  const javaScriptGzipBytes = javaScriptEntries.reduce(
    (total, entry) => total + entry.gzipBytes,
    0,
  );
  const cssGzipBytes = cssEntries.reduce(
    (total, entry) => total + entry.gzipBytes,
    0,
  );
  const curriculumGzipBytes = sum('curriculum');
  const runtimeAssetGzipBytes = sum('runtime');
  const violations = [];
  // Reported, never a failure.
  const warnings = [];

  if (largestJavaScriptRawBytes > budget.maxJavaScriptRawBytes) {
    violations.push(
      `Largest JavaScript chunk is ${largestJavaScriptRawBytes} bytes; limit is ${budget.maxJavaScriptRawBytes}.`,
    );
  }

  if (javaScriptGzipBytes > budget.maxJavaScriptGzipBytes) {
    violations.push(
      `Total JavaScript gzip is ${javaScriptGzipBytes} bytes; limit is ${budget.maxJavaScriptGzipBytes}.`,
    );
  }

  if (cssGzipBytes > budget.maxCssGzipBytes) {
    violations.push(
      `Total CSS gzip is ${cssGzipBytes} bytes; limit is ${budget.maxCssGzipBytes}.`,
    );
  } else if (cssGzipBytes > budget.cssGzipWarningBytes) {
    warnings.push(
      `Total CSS gzip is ${cssGzipBytes} bytes, above the ${budget.cssGzipWarningBytes}-byte warning level (hard limit ${budget.maxCssGzipBytes}).`,
    );
  }

  if (curriculumGzipBytes > budget.maxCurriculumGzipBytes) {
    violations.push(
      `Packaged curriculum gzip is ${curriculumGzipBytes} bytes; limit is ${budget.maxCurriculumGzipBytes}.`,
    );
  }

  if (runtimeAssetGzipBytes > budget.maxRuntimeAssetGzipBytes) {
    violations.push(
      `Python runtime assets gzip is ${runtimeAssetGzipBytes} bytes; limit is ${budget.maxRuntimeAssetGzipBytes}.`,
    );
  }

  for (const entry of entries.filter((item) => item.kind === 'unexpected')) {
    violations.push(
      `${entry.path} is not an allowed file type for its asset class.`,
    );
  }

  return {
    cssGzipBytes,
    curriculumGzipBytes,
    javaScriptGzipBytes,
    largestJavaScriptRawBytes,
    runtimeAssetGzipBytes,
    violations,
    warnings,
  };
}
