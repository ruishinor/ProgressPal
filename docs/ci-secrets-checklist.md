# CI secrets checklist

The foundation release workflow requires no repository secrets.

## Required now

- [x] `GITHUB_TOKEN`: supplied automatically by GitHub with read-only contents permission.
- [x] No application secrets, API keys, account credentials, analytics keys, AI provider keys, or Vercel credentials are referenced.

## Prohibited in tests and artifacts

- [ ] No real learner backups or notes.
- [ ] No production browser profile data.
- [ ] No private deployment tokens in console output.
- [ ] No secrets embedded in screenshots, videos, traces, reports, or evidence manifests.

## Later hosted-preview module

If automated Vercel deployment is authorized later, document the exact minimum-scoped Vercel credentials and environment before adding them. Do not add a deployment secret to this validation-only workflow and do not reuse personal credentials in fixtures.
