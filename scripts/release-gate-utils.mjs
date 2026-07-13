export function diagnosticLines(stdout, stderr) {
  const diagnosticPattern = /\b(warning|warn|error|failed|failure)\b/i;
  return [
    ...stderr.split(/\r?\n/).filter((line) => diagnosticPattern.test(line)),
    ...stdout
      .split(/\r?\n/)
      .filter((line) => /^\s*(warning|warn)\b/i.test(line)),
  ];
}

export function sanitizeEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([key]) => !['FORCE_COLOR', 'NO_COLOR'].includes(key.toUpperCase()),
    ),
  );
}
