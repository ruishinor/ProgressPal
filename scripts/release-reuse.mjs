import { isDeepStrictEqual } from 'node:util';
import {
  enforceCommandPolicy,
  validateNodeTests,
  validateTestReport,
} from './release-gate-utils.mjs';
import {
  ARTIFACT,
  COMMANDS,
  CONTRACT,
  REPOSITORY,
  REPOSITORY_ID,
  STEPS,
  WORKFLOW,
  normalizedCommands,
} from './release-reuse-contract.mjs';
import { MAX_ARCHIVE, readZip, sha256 } from './release-reuse-zip.mjs';

export class ReuseError extends Error {
  constructor(reason, decision = 'FULL') {
    super(reason);
    this.reason = reason;
    this.decision = decision;
  }
}
export function requireProof(condition, reason, decision) {
  if (!condition) throw new ReuseError(reason, decision);
}

// Each request and the entire discovery have a deadline. Pagination is bounded;
// overflowing a bound means FULL, never a partial positive result.
export function githubClient(
  token,
  fetcher = fetch,
  deadline = Date.now() + 60_000,
) {
  const root = `https://api.github.com/repos/${REPOSITORY}/`;
  async function request(path, binary = false) {
    requireProof(Date.now() < deadline, 'SOURCE_LOOKUP_TIMEOUT');
    const response = await fetcher(root + path, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(
        Math.max(1, Math.min(10_000, deadline - Date.now())),
      ),
      redirect: binary ? 'follow' : 'error',
    });
    requireProof(response.ok, 'SOURCE_API_UNAVAILABLE');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      requireProof(
        size <= (binary ? MAX_ARCHIVE : 8 * 1024 * 1024),
        'SOURCE_RESPONSE_LIMIT',
      );
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    return binary ? bytes : JSON.parse(bytes.toString('utf8'));
  }
  return {
    get: request,
    async list(path, key) {
      const all = [];
      for (let page = 1; page <= 3; page++) {
        const result = await request(
          `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
        );
        const rows = key ? result[key] : result;
        requireProof(Array.isArray(rows), 'SOURCE_RESPONSE_INVALID');
        all.push(...rows);
        if (rows.length < 100) {
          if (key)
            requireProof(
              result.total_count === all.length,
              'SOURCE_PAGINATION_CHANGED',
            );
          return all;
        }
      }
      throw new ReuseError('SOURCE_PAGINATION_LIMIT');
    },
  };
}

export function selectPr(prs, current) {
  const matches = prs.filter(
    (pr) =>
      pr.merged_at &&
      pr.merge_commit_sha === current.sha &&
      pr.base?.ref === 'master' &&
      pr.base?.sha === current.parents[0] &&
      pr.head?.sha === current.parents[1] &&
      pr.base?.repo?.id === REPOSITORY_ID &&
      pr.head?.repo?.id === REPOSITORY_ID,
  );
  requireProof(
    matches.length === 1,
    matches.length ? 'SOURCE_PR_AMBIGUOUS' : 'SOURCE_PR_MISSING',
  );
  return matches[0];
}

export function verifyRun(run, job, check, pr, workflowId) {
  requireProof(
    run.status === 'completed' &&
      run.conclusion === 'success' &&
      run.event === 'pull_request' &&
      run.path === WORKFLOW &&
      run.workflow_id === workflowId &&
      run.repository?.id === REPOSITORY_ID &&
      run.repository?.full_name === REPOSITORY &&
      run.head_repository?.id === REPOSITORY_ID &&
      run.head_sha === pr.head.sha &&
      Number.isSafeInteger(run.run_attempt) &&
      run.run_attempt > 0,
    'SOURCE_RUN_INVALID',
  );
  // Empty pull_requests is normal. A contradictory nonempty association is not.
  requireProof(
    Array.isArray(run.pull_requests) &&
      (run.pull_requests.length === 0 ||
        (run.pull_requests.length === 1 &&
          run.pull_requests[0].number === pr.number)),
    'SOURCE_PR_CONTRADICTION',
  );
  requireProof(
    job.name === 'Final candidate' &&
      job.status === 'completed' &&
      job.conclusion === 'success' &&
      job.run_id === run.id &&
      job.run_attempt === run.run_attempt &&
      job.head_sha === pr.head.sha &&
      STEPS.every((name) => {
        const steps = job.steps.filter((s) => s.name === name);
        return (
          steps.length === 1 &&
          steps[0].status === 'completed' &&
          steps[0].conclusion === 'success'
        );
      }),
    'SOURCE_JOB_INVALID',
  );
  requireProof(
    check.id === job.id &&
      check.name === 'Final candidate' &&
      check.app?.slug === 'github-actions' &&
      check.app?.id === 15368 &&
      check.status === 'completed' &&
      check.conclusion === 'success' &&
      check.head_sha === run.head_sha &&
      check.check_suite?.id === run.check_suite_id,
    'SOURCE_PRODUCER_INVALID',
  );
}

export async function verifyEvidence(entries, artifact, run, job, pr, current) {
  const manifests = [...entries].filter(([name]) =>
    /^artifacts\/release-evidence\/[^/]+-pass-\d+\.json$/.test(name),
  );
  requireProof(manifests.length === 1, 'SOURCE_MANIFEST_AMBIGUOUS');
  const manifest = JSON.parse(manifests[0][1]);
  const binding = manifest.certification;
  requireProof(
    manifest.schemaVersion === 3 &&
      binding?.certificationContractVersion === CONTRACT &&
      binding.certificationKind === 'comprehensive',
    'SOURCE_CONTRACT_UNSUPPORTED',
  );
  requireProof(
    binding.repository === REPOSITORY &&
      binding.repositoryId === REPOSITORY_ID &&
      binding.runId === run.id &&
      binding.runAttempt === run.run_attempt &&
      binding.job === 'final-candidate' &&
      binding.workflowRef ===
        `${REPOSITORY}/${WORKFLOW}@refs/pull/${pr.number}/merge` &&
      binding.workflowSha === manifest.commitSha &&
      binding.checkout === manifest.commitSha &&
      binding.pr?.number === pr.number &&
      binding.pr.base === current.parents[0] &&
      binding.pr.head === current.parents[1] &&
      binding.pr.baseRepositoryId === REPOSITORY_ID &&
      binding.pr.headRepositoryId === REPOSITORY_ID &&
      isDeepStrictEqual(binding.parents, current.parents) &&
      manifest.githubEvent?.sha === manifest.commitSha &&
      manifest.githubEvent.eventName === 'pull_request' &&
      manifest.githubEvent.ref === `refs/pull/${pr.number}/merge` &&
      manifest.workflowUrl ===
        `https://github.com/${REPOSITORY}/actions/runs/${run.id}`,
    'SOURCE_BINDING_INVALID',
  );
  requireProof(manifest.treeSha === current.tree, 'SOURCE_TREE_DIFFERENT');
  requireProof(
    binding.controls === current.controls,
    'SOURCE_CONTROLS_CHANGED',
  );
  requireProof(
    manifest.os?.platform === current.platform &&
      binding.arch === current.arch &&
      manifest.nodeVersion === current.nodeVersion &&
      manifest.npmVersion === current.npmVersion &&
      manifest.lockfileSha256 === current.lockfileSha256,
    'SOURCE_ENVIRONMENT_DIFFERENT',
  );
  requireProof(
    isDeepStrictEqual(binding.testRunners, current.testRunners) &&
      typeof binding.testRunners?.vitest === 'string' &&
      typeof binding.testRunners?.playwright === 'string' &&
      manifest.playwrightVersion ===
        `Version ${current.testRunners.playwright}` &&
      /^\d+\.\d+\.\d+\.\d+$/.test(manifest.browserVersion),
    'SOURCE_RUNNER_VERSION_INVALID',
  );
  requireProof(
    manifest.payloadTreeSha === current.payload &&
      manifest.reviewEvidence?.payloadTree === current.payload &&
      manifest.reviewEvidence.sha256 === current.review.sha256 &&
      manifest.reviewEvidence.path === current.review.path,
    'SOURCE_REVIEW_DIFFERENT',
  );
  const start = Date.parse(manifest.startedAt),
    end = Date.parse(manifest.endedAt);
  requireProof(
    Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= end &&
      start >= Date.parse(job.started_at) &&
      end <= Date.parse(job.completed_at) &&
      Date.parse(artifact.created_at) >= end &&
      Date.parse(artifact.created_at) <= Date.parse(job.completed_at),
    'SOURCE_ATTEMPT_TIME_INVALID',
  );
  requireProof(
    manifest.status === 'passed' &&
      manifest.failure === null &&
      isDeepStrictEqual(normalizedCommands(manifest.commands), COMMANDS) &&
      manifest.totals?.commandCount === COMMANDS.length &&
      manifest.totals.skipCount === 0 &&
      manifest.totals.retryCount === 0,
    'SOURCE_COMMAND_PROFILE_INVALID',
  );
  for (const command of manifest.commands) {
    const gitCommand = [
      'commit SHA',
      'tree SHA',
      'initial clean status',
      'diff check',
      'final clean status',
    ].includes(command.label);
    requireProof(
      gitCommand
        ? command.executable === 'git'
        : typeof command.executable === 'string' &&
            command.executable.endsWith('/node'),
      'SOURCE_COMMAND_PROFILE_INVALID',
    );
    requireProof(
      command.exitCode === 0 &&
        command.signal === null &&
        command.timedOut === false &&
        command.interrupted === false &&
        command.validation === 'passed' &&
        Array.isArray(command.policyViolations) &&
        command.policyViolations.length === 0,
      'SOURCE_POLICY_INVALID',
    );
    if (
      ['release gate unit tests', 'bundle budget unit tests'].includes(
        command.label,
      )
    ) {
      const copy = { ...command };
      validateNodeTests(copy);
      requireProof(
        copy.testCount === command.testCount &&
          command.skipCount === 0 &&
          command.retryCount === 0,
        'SOURCE_TAP_INVALID',
      );
    }
    const runner =
      command.label === 'unit and integration tests'
        ? 'vitest'
        : command.label === 'end-to-end tests'
          ? 'playwright'
          : null;
    if (runner) {
      const report = command.testReport;
      requireProof(
        report &&
          typeof report.invocation === 'string' &&
          report.invocation.length > 0 &&
          report.path ===
            `artifacts/release-evidence/${report.invocation}-${runner}.json` &&
          entries.has(report.path),
        'SOURCE_REPORT_MISSING',
      );
      const raw = entries.get(report.path);
      requireProof(
        sha256(raw) === report.sha256,
        'SOURCE_REPORT_DIGEST_INVALID',
      );
      const parsed = JSON.parse(raw);
      requireProof(
        isDeepStrictEqual(parsed, report.result),
        'SOURCE_REPORT_CONTENT_INVALID',
      );
      const counts = validateTestReport(parsed, report.invocation, runner);
      requireProof(
        Object.entries(counts).every(([key, value]) => command[key] === value),
        'SOURCE_REPORT_COUNTS_INVALID',
      );
    }
  }
  requireProof(
    manifest.commands[0].stdout === manifest.commitSha &&
      manifest.commands[1].stdout === current.tree,
    'SOURCE_CHECKOUT_INVALID',
  );
  requireProof(
    manifest.commands.find((c) => c.label === 'Playwright version').stdout ===
      manifest.playwrightVersion &&
      manifest.commands.find((c) => c.label === 'Chromium version').stdout ===
        manifest.browserVersion,
    'SOURCE_RUNNER_VERSION_INVALID',
  );
  return manifest;
}

export async function discoverSource(api, current) {
  requireProof(current.parents.length === 2, 'CURRENT_MERGE_UNSUPPORTED');
  const linked = await api.list(`commits/${current.sha}/pulls`);
  const prs = await Promise.all(
    linked.map((pr) => api.get(`pulls/${pr.number}`)),
  );
  const pr = selectPr(prs, current);
  const workflow = await api.get('actions/workflows/test.yml');
  requireProof(
    workflow.path === WORKFLOW && workflow.state === 'active',
    'SOURCE_WORKFLOW_INVALID',
  );
  const runs = await api.list(
    `actions/workflows/${workflow.id}/runs?event=pull_request&head_sha=${pr.head.sha}`,
    'workflow_runs',
  );
  const newest = runs.sort((a, b) => b.id - a.id)[0];
  requireProof(newest, 'SOURCE_RUN_MISSING');
  requireProof(newest.status === 'completed' && newest.conclusion === 'success', 'SOURCE_RUN_INVALID');
  const run = await api.get(`actions/runs/${newest.id}`);
  const jobs = await api.list(
    `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,
    'jobs',
  );
  requireProof(jobs.length === 1, 'SOURCE_JOB_AMBIGUOUS');
  const job = jobs[0];
  requireProof(
    job.check_run_url ===
      `https://api.github.com/repos/${REPOSITORY}/check-runs/${job.id}`,
    'SOURCE_PRODUCER_INVALID',
  );
  const check = await api.get(`check-runs/${job.id}`);
  verifyRun(run, job, check, pr, workflow.id);
  const artifacts = (
    await api.list(`actions/runs/${run.id}/artifacts`, 'artifacts')
  ).filter((a) => a.name === ARTIFACT);
  requireProof(artifacts.length === 1, 'SOURCE_ARTIFACT_AMBIGUOUS');
  const artifact = artifacts[0];
  requireProof(
    artifact.expired === false &&
      artifact.size_in_bytes > 0 &&
      artifact.size_in_bytes <= MAX_ARCHIVE &&
      /^sha256:[a-f0-9]{64}$/.test(artifact.digest) &&
      artifact.workflow_run?.id === run.id &&
      artifact.workflow_run.repository_id === REPOSITORY_ID &&
      artifact.workflow_run.head_repository_id === REPOSITORY_ID &&
      artifact.workflow_run.head_sha === pr.head.sha,
    'SOURCE_ARTIFACT_IDENTITY_INVALID',
  );
  const bytes = await api.get(`actions/artifacts/${artifact.id}/zip`, true);
  requireProof(
    bytes.length === artifact.size_in_bytes,
    'SOURCE_ARTIFACT_SIZE_INVALID',
  );
  const entries = readZip(bytes, artifact.digest);
  const manifest = await verifyEvidence(
    entries,
    artifact,
    run,
    job,
    pr,
    current,
  );
  const synthetic = await api.get(`git/commits/${manifest.commitSha}`);
  requireProof(
    synthetic.sha === manifest.commitSha &&
      synthetic.tree?.sha === current.tree &&
      isDeepStrictEqual(
        synthetic.parents?.map((p) => p.sha),
        current.parents,
      ),
    'SOURCE_TOPOLOGY_INVALID',
  );
  // Refuse an attempt replaced during discovery. Do not follow today's PR merge ref.
  const latest = await api.get(`actions/runs/${run.id}`);
  requireProof(
    latest.run_attempt === run.run_attempt &&
      latest.status === 'completed' &&
      latest.conclusion === 'success',
    'SOURCE_RACE',
  );
  return {
    synthetic: synthetic.sha,
    run: run.id,
    attempt: run.run_attempt,
    job: job.id,
    pr: pr.number,
    artifact: artifact.id,
    artifactDigest: artifact.digest,
    head: pr.head.sha,
    workflowId: workflow.id,
  };
}

export async function recheckSource(api, source) {
  const runs = await api.list(`actions/workflows/${source.workflowId}/runs?event=pull_request&head_sha=${source.head}`, 'workflow_runs');
  requireProof(runs.length > 0 && Math.max(...runs.map(run => run.id)) === source.run, 'SOURCE_RACE');
  const latest = await api.get(`actions/runs/${source.run}`);
  requireProof(latest.id === source.run && latest.run_attempt === source.attempt && latest.status === 'completed' && latest.conclusion === 'success', 'SOURCE_RACE');
  const artifact = await api.get(`actions/artifacts/${source.artifact}`);
  requireProof(artifact.id === source.artifact && artifact.expired === false && artifact.digest === source.artifactDigest && artifact.workflow_run?.id === source.run, 'SOURCE_RACE');
}

export async function decideReuse({ currentCheck, discover, audit, recheck }) {
  let current;
  try {
    current = await currentCheck();
  } catch (error) {
    return {
      decision: error.decision ?? 'FULL',
      reason: error.reason ?? 'VERIFIER_UNAVAILABLE',
    };
  }
  let source;
  try {
    source = await discover(current);
  } catch (error) {
    return {
      decision: 'FULL',
      reason: error.reason ?? 'SOURCE_EVIDENCE_UNAVAILABLE',
    };
  }
  try {
    const result = await audit();
    await enforceCommandPolicy(result);
    try {
      await recheck(current, source);
    } catch (error) {
      return {
        decision: error.decision ?? 'FULL',
        reason: error.reason ?? 'SOURCE_API_UNAVAILABLE',
        source,
      };
    }
    return {
      decision: 'ATTEST',
      reason: 'EXACT_SOURCE_CERTIFIED',
      source,
      audit: { exitCode: result.exitCode, sha256: sha256(result.stdout) },
    };
  } catch (error) {
    return {
      decision: 'BLOCK',
      reason: error.reason ?? 'CURRENT_AUDIT_FAILED',
      source,
    };
  }
}

// Shared orchestration contract; the installed workflow uses shadow unconditionally.
export async function executeDecision(mode, decision, { full, attest }) {
  if (mode !== 'enforce') return full();
  if (decision.decision === 'BLOCK') throw new Error(decision.reason);
  return decision.decision === 'ATTEST' ? attest() : full();
}
