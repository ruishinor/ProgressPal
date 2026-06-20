# Code of Conduct

## Purpose

ProgressPal is a focused software project. The goal is to build a trustworthy local-first study companion without wasting contributor time, damaging the working engine, or creating misleading claims.

This Code of Conduct applies to project discussions, issues, pull requests, reviews, and related project spaces.

## Expected behavior

Contributors are expected to:

- be direct and respectful;
- focus on evidence and implementation reality;
- explain tradeoffs clearly;
- keep criticism specific to work, not people;
- preserve user trust and data safety;
- avoid overbuilding;
- avoid hype and unsupported claims;
- document decisions that affect scope, architecture, data, privacy, or branding;
- follow the source-of-truth roadmap and accepted decisions.

## Unacceptable behavior

Unacceptable behavior includes:

- harassment, insults, or personal attacks;
- discriminatory or exclusionary behavior;
- deliberate misrepresentation of project status;
- adding hidden telemetry, analytics, or network behavior;
- weakening privacy/local-first claims without disclosure;
- presenting ProgressPal as official CS50/Harvard/edX/OpenCourseWare software;
- introducing unlicensed or misleading assets;
- dismissing data-loss or accessibility concerns;
- pushing broad refactors or unrelated features through module work;
- repeatedly ignoring validation gates or review feedback.

## Review culture

Review should be precise.

Good review comments:

```text
This changes backup semantics and needs a decision record.
This route writes data on render; read-only routes must not mutate stores.
This asset lacks an ASSETS.md ledger entry.
This copy implies official CS50 completion.
This component is not required for the current module.
```

Poor review comments:

```text
Make it cooler.
This feels wrong.
Add more polish while you are here.
Probably fine.
```

## Project-specific trust rules

ProgressPal must remain honest about:

- local-only data;
- browser storage loss risk;
- lack of account recovery;
- non-affiliation with Harvard/CS50/edX/OpenCourseWare;
- local progress versus official course completion;
- what is tracked and what is not tracked.

## Enforcement

Maintainers may:

- request changes;
- close issues or pull requests;
- revert changes;
- block a module from proceeding;
- remove content that violates the project boundary or this Code of Conduct.

Serious or repeated violations may result in loss of contribution access.

## Reporting

Report conduct issues to the project maintainer through the preferred project contact route. If the issue is also a security concern, follow `SECURITY.md`.

## Scope

This Code of Conduct is intended to keep project work clear, safe, and useful. It is not a substitute for the roadmap, migration contract, validation log, or security policy.
