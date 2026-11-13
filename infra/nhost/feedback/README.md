# Private feedback intake — deployment is NOT automatically enabled

This source is a **prepared candidate**, not evidence of provider deployment.
Do not enable FEEDBACK_INTAKE_ENABLED before ALL checks below succeed.

## Apply / verify (operator authorized separately)

1. Confirm the actual Nhost project identity, source DB role, PostgreSQL version,
   and the current SQL/Hasura migration state. Back up affected metadata.
2. Review and apply up.sql once to the intended existing Nhost PostgreSQL DB.
   Validate the SQL and function as the installed Hasura connection user.
3. Track the response wrapper and submit_feedback function using metadata.json;
   **do not create public or user GraphQL permissions**. Verify anonymous and
   ordinary authenticated GraphQL cannot select, insert or call the function.
4. Configure the server-only Vercel secret FEEDBACK_NHOST_ADMIN_SECRET from the
   verified Nhost admin credential in the real provider settings. Never expose
   via VITE_, browser, logs, PR, GH Actions, screenshot or docs.
5. Verify protected POST /api/feedback on the actual preview; it must return JSON,
   and GET must return 405 JSON. Deep SPA links must still load.
6. In Vercel firewall, verify a real deployed/active rate limit, including
   direct deployment hostnames/preview bypass paths. Suggested starting rule:
   POST /api/feedback, <= 5 per ten minutes per source. If firewall access,
   quota or coverage cannot be confirmed, keep intake disabled.
7. Arrange a real recurring server-side retention job (e.g. verified pg_cron)
   to call SELECT progresspal_feedback.purge_expired(). Confirm the job runs
   and expires a synthetic >90-day row. Do not claim 90-day expiry based on
   the existence of the function alone. Separately review Nhost backups/logs.
8. Confirm private console maintainer read/triage/delete permissions; exercise
   a synthetic report, exact receipt readback, repeated-id same receipt,
   different-payload conflict, WAF and the atomic daily cap. Remove test data.
9. Only then enable FEEDBACK_INTAKE_ENABLED=true for authorized environments,
   deploying through established release and promotion controls. Record evidence
   and update PRIVACY.md with verified retention and operator contact policy.

## Operational boundaries

Fields: one category, bounded free text, optional voluntary email and optional
coarse client diagnostics. No browser/local learner records are accessed. Private
reports are NOT public GitHub issues; security disclosure needs a separate route.
The DB quota is 200 accepted new reports per UTC day **globally**, not per user;
it prevents unbounded growth but can be exhausted by an attacker. A verified WAF
limit is additional and essential. 429 may indicate global cap. Retrying the
same requestId with identical payload does not consume quota again.

Triage with private Nhost console access: show new reports oldest-first, mark
triaged/resolved, and delete raw personal data upon justified requests.
Never paste original report text/email into a public issue without permission.

**Failure response:** disable the function with FEEDBACK_INTAKE_ENABLED=false
and verify the live setting. The reversible DB-level stop is disable.sql,
but this will disable submissions even for a valid server credential. Do not
drop the schema or destroy existing reports as part of operational rollback.

Server-only secret rotation, emergency disabling, observability and retention
need actual assigned maintainer ownership. HTTP and provider infrastructure
logs may have independent retention; do not promise deletion of those logs.
