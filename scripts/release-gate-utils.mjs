export function diagnosticLines(stdout, stderr) {
  const diagnosticPattern = /\b(warning|warn|error|failed|failure)\b/i;
  return [
    ...stderr.split(/\r?\n/).filter((line) => diagnosticPattern.test(line)),
    ...stdout
      .split(/\r?\n/)
      .filter((line) => /^\s*(warning|warn)\b/i.test(line)),
  ];
}

function maximumMatchedCount(value, patterns) {
  let maximum = 0;

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      maximum = Math.max(maximum, Number(match[1] ?? 0));
    }
  }

  return maximum;
}

export function executionSummary(stdout, stderr = '') {
  const output = `${stdout}\n${stderr}`;
  const skipCount = maximumMatchedCount(output, [
    /\b(\d+)\s+(?:skipped|pending|todo)\b/gi,
    /\b(?:skipped|pending|todo)\s+(\d+)\b/gi,
    /\b(?:skipped|pending|todo)\s*[:=]\s*(\d+)\b/gi,
  ]);
  const retryCount = maximumMatchedCount(output, [
    /\b(\d+)\s+(?:retried|retries|retry)\b/gi,
    /\b(?:retried|retries|retry)\s+(\d+)\b/gi,
    /\bretr(?:y|ies)\s*[:=]\s*(\d+)\b/gi,
  ]);
  const testCount = maximumMatchedCount(output, [
    /^\s*Tests\s+\d+\s+passed\s+\((\d+)\)/gim,
    /^\s*Test Files\s+\d+\s+passed\s+\((\d+)\)/gim,
    /^\s*(\d+)\s+passed(?:\s+\([^\n]+\))?\s*$/gim,
    /^#\s+tests\s+(\d+)\s*$/gim,
  ]);

  return {
    retryCount,
    skipCount,
    testCount: testCount === 0 ? null : testCount,
  };
}

export function validateReviewEvidence(value, expectedModule) {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Release review evidence must be a JSON object.');
  }

  const evidence = value;

  if (evidence.schemaVersion !== 1) {
    throw new Error('Release review evidence schemaVersion must be 1.');
  }
  if (evidence.module !== expectedModule) {
    throw new Error(
      `Release review module ${String(evidence.module)} does not match ${expectedModule}.`,
    );
  }
  if (
    typeof evidence.reviewer !== 'string' ||
    evidence.reviewer.trim().length === 0
  ) {
    throw new Error('Release review evidence requires a reviewer.');
  }
  if (
    !Array.isArray(evidence.adversarialFindings) ||
    evidence.adversarialFindings.length === 0
  ) {
    throw new Error('Release review evidence requires adversarial findings.');
  }

  for (const finding of evidence.adversarialFindings) {
    if (typeof finding !== 'object' || finding === null) {
      throw new Error('Every adversarial finding must be an object.');
    }
    if (
      typeof finding.id !== 'string' ||
      !['P0', 'P1', 'P2', 'P3'].includes(finding.severity) ||
      typeof finding.description !== 'string' ||
      finding.description.trim().length === 0 ||
      typeof finding.resolution !== 'string' ||
      finding.resolution.trim().length === 0 ||
      !['accepted-risk', 'resolved'].includes(finding.status)
    ) {
      throw new Error(
        'Every adversarial finding requires id, P0-P3 severity, description, resolution, and a resolved or accepted-risk status.',
      );
    }
    if (
      ['P0', 'P1'].includes(finding.severity) &&
      finding.status !== 'resolved'
    ) {
      throw new Error('P0 and P1 findings must be resolved before release.');
    }
  }

  if (
    typeof evidence.retrospective !== 'object' ||
    evidence.retrospective === null ||
    evidence.retrospective.decision !== 'proceed' ||
    typeof evidence.retrospective.summary !== 'string' ||
    evidence.retrospective.summary.trim().length === 0
  ) {
    throw new Error(
      'Release review evidence requires a proceed retrospective decision and summary.',
    );
  }

  return {
    adversarialFindings: evidence.adversarialFindings,
    retrospective: evidence.retrospective,
    reviewer: evidence.reviewer.trim(),
  };
}

export function sanitizeEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([key]) => !['FORCE_COLOR', 'NO_COLOR'].includes(key.toUpperCase()),
    ),
  );
}
