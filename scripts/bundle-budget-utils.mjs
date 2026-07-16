export const releaseBundleBudget = Object.freeze({
  maxCssGzipBytes: 10_000,
  maxJavaScriptGzipBytes: 400_000,
  maxJavaScriptRawBytes: 500_000,
});

export function evaluateBundleBudget(entries, budget = releaseBundleBudget) {
  const javaScriptEntries = entries.filter((entry) => entry.kind === 'js');
  const cssEntries = entries.filter((entry) => entry.kind === 'css');
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
  const violations = [];

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
  }

  return {
    cssGzipBytes,
    javaScriptGzipBytes,
    largestJavaScriptRawBytes,
    violations,
  };
}
