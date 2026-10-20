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
  maxJavaScriptGzipBytes: 400_000,
  maxJavaScriptRawBytes: 500_000,
  maxCurriculumGzipBytes: 150_000,
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
