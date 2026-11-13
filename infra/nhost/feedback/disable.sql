-- Non-destructive emergency stop. Also set FEEDBACK_INTAKE_ENABLED=false
-- on Vercel (including previews); verify the new deployment actually serves.
BEGIN;
REVOKE EXECUTE ON FUNCTION progresspal_feedback.submit_feedback(jsonb) FROM nhost_hasura;
COMMIT;
