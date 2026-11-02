import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  REPOSITORY,
  REPOSITORY_ID,
  WORKFLOW,
  controlFingerprint,
  git,
} from './release-reuse-contract.mjs';
import {
  decideReuse,
  discoverSource,
  githubClient,
  requireProof,
  recheckSource,
  executeDecision,
} from './release-reuse.mjs';
import {
  payloadTree,
  readEvidenceFiles,
  resolveReviewEvidence,
} from './release-review-binding.mjs';
import {
  runContainedCommand,
  sanitizeEnvironment,
} from './release-gate-utils.mjs';
import { sha256 } from './release-reuse-zip.mjs';

export async function selectCertification() {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const env = process.env;
  const api = githubClient(env.GITHUB_TOKEN);
  const started = Date.now();
  const invocation = randomUUID();
  const operations = {
    async currentCheck() {
      requireProof(
        env.GITHUB_EVENT_NAME === 'push' &&
          env.GITHUB_REF === 'refs/heads/master',
        'CURRENT_EVENT_FULL_ONLY',
      );
      const sha = git(cwd, 'rev-parse', 'HEAD');
      const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
      requireProof(
        sha === env.GITHUB_SHA &&
          event.after === sha &&
          event.ref === 'refs/heads/master' &&
          env.GITHUB_REPOSITORY === REPOSITORY &&
          event.repository?.id === REPOSITORY_ID &&
          env.GITHUB_WORKFLOW_REF ===
            `${REPOSITORY}/${WORKFLOW}@refs/heads/master` &&
          env.GITHUB_WORKFLOW_SHA === sha &&
          git(cwd, 'status', '--porcelain=v1') === '',
        'CURRENT_IDENTITY_INVALID',
        'BLOCK',
      );
      const payload = payloadTree({ cwd });
      let review;
      try {
        review = resolveReviewEvidence({
          candidatePayloadTree: payload,
          files: readEvidenceFiles({ cwd }),
        }).selected;
      } catch {
        requireProof(false, 'CURRENT_REVIEW_INVALID', 'BLOCK');
      }
      const parents = git(cwd, 'show', '-s', '--format=%P', sha).split(' ');
      requireProof(parents.length === 2, 'CURRENT_MERGE_UNSUPPORTED');
      const controls = controlFingerprint(cwd, 'HEAD');
      requireProof(
        controls === controlFingerprint(cwd, parents[0]),
        'CURRENT_CONTROLS_CHANGED',
      );
      requireProof(
        process.platform === 'linux' &&
          process.arch === 'x64' &&
          /^v24\./.test(process.version),
        'CURRENT_ENVIRONMENT_UNSUPPORTED',
      );
      const npmVersion = execFileSync('npm', ['--version'], {
        encoding: 'utf8',
        timeout: 10_000,
      }).trim();
      requireProof(npmVersion === '11.10.1', 'CURRENT_ENVIRONMENT_UNSUPPORTED');
      const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8'));
      const lockBytes = await readFile(join(cwd, 'package-lock.json'));
      const lock = JSON.parse(lockBytes);
      requireProof(
        pkg.version === lock.version &&
          pkg.version === lock.packages?.['']?.version &&
          pkg.scripts.audit === 'npm audit --audit-level=moderate',
        'CURRENT_PACKAGE_POLICY_INVALID',
        'BLOCK',
      );
      return {
        sha,
        parents,
        tree: git(cwd, 'rev-parse', 'HEAD^{tree}'),
        controls,
        payload,
        review,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        npmVersion,
        lockfileSha256: sha256(lockBytes),
        testRunners: {
          vitest: lock.packages['node_modules/vitest'].version,
          playwright: lock.packages['node_modules/@playwright/test'].version,
        },
      };
    },
    discover: (current) => discoverSource(api, current),
    async audit() {
      const auditEnv = sanitizeEnvironment(env);
      delete auditEnv.GITHUB_TOKEN;
      delete auditEnv.GH_TOKEN;
      const outcome = await runContainedCommand({
        cwd,
        executable: 'npm',
        args: [
          'audit',
          '--package-lock-only',
          '--ignore-scripts',
          '--audit-level=moderate',
          '--json',
          '--include=dev',
          '--include=optional',
          '--include=peer',
        ],
        env: auditEnv,
        timeoutMs: 60_000,
      });
      return {
        label: 'fresh dependency audit',
        exitCode: outcome.code,
        signal: outcome.signal,
        timedOut: outcome.timedOut,
        interrupted: outcome.interrupted,
        stdout: outcome.stdout,
      };
    },
    async recheck(current, source) {
      await recheckSource(api, source);
      requireProof(
        git(cwd, 'rev-parse', 'HEAD') === current.sha &&
          git(cwd, 'status', '--porcelain=v1') === '',
        'CURRENT_CHECKOUT_CHANGED',
        'BLOCK',
      );
      const ref = await api.get('git/ref/heads/master');
      requireProof(ref.object?.sha === current.sha, 'CURRENT_MASTER_MOVED');
    },
  };
  const result = await decideReuse(operations);
  const directory = join(cwd, 'artifacts/release-evidence');
  return executeDecision(result, {
    full: async () => {
      const fallback = {
        decision: 'FULL',
        reason:
          result.decision === 'ATTEST'
            ? 'ATTEST_OPERATION_UNAVAILABLE'
            : result.reason,
      };
      console.log(JSON.stringify(fallback));
      return fallback;
    },
    attest: async () => {
      const current = await operations.currentCheck();
      await operations.recheck(current, result.source);
      const record = {
        kind: 'certification-reuse',
        invocation,
        executed: 'ATTEST',
        ...result,
        current: env.GITHUB_SHA,
        target: current,
        run: env.GITHUB_RUN_ID,
        attempt: env.GITHUB_RUN_ATTEMPT,
        elapsedMs: Date.now() - started,
      };
      await mkdir(directory, { recursive: true });
      const path = join(directory, `reuse-${invocation}.json`);
      const bytes = JSON.stringify(record, null, 2) + '\n';
      await writeFile(path, bytes, { flag: 'wx' });
      requireProof(
        sha256(await readFile(path)) === sha256(bytes),
        'ATTEST_RECORD_UNAVAILABLE',
      );
      console.log(JSON.stringify(record));
      return record;
    },
  });
}
