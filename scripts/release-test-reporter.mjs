import { writeFileSync } from 'node:fs';

// Release-only adapter: both runners retain their ordinary terminal reporter.
export default class ReleaseReporter {
  onTestRunStart(specifications) {
    this.expected = specifications.length;
  }

  onTestRunEnd(modules, errors, reason) {
    this.write({
      runner: 'vitest',
      status: reason,
      errors: errors.length,
      expected: this.expected,
      units: modules.map((module) => ({
        status: module.state(),
        tests: [...module.children.allTests()].map((test) => ({
          name: test.fullName,
          status: test.result().state,
          retries: test.diagnostic()?.retryCount ?? null,
        })),
      })),
    });
  }

  onBegin(_config, suite) {
    this.tests = suite.allTests();
    this.errors = 0;
  }

  onError() {
    this.errors++;
  }

  onEnd(result) {
    this.write({
      runner: 'playwright',
      status: result.status,
      errors: this.errors,
      expected: 1,
      units: [
        {
          status: result.status,
          tests: this.tests.map((test) => ({
            name: test.titlePath().join(' > '),
            status:
              test.results.length === 1 && test.expectedStatus === 'passed'
                ? test.results[0].status
                : 'incomplete',
            retries: Math.max(0, test.results.length - 1),
          })),
        },
      ],
    });
  }

  write(result) {
    writeFileSync(
      process.env.RELEASE_TEST_REPORT,
      JSON.stringify({
        schemaVersion: 1,
        invocation: process.env.RELEASE_TEST_INVOCATION,
        ...result,
      }) + '\n',
      { flag: 'wx' },
    );
  }
}
