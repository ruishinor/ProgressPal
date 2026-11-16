-- READ-ONLY: Hasura metadata for progresspal_social (tracked tables/functions and permissions).
SELECT jsonb_pretty(jsonb_build_object(
  'tables', (SELECT jsonb_agg(t) FROM jsonb_array_elements(s->'tables') t
             WHERE t->'table'->>'schema' = 'progresspal_social'),
  'functions', (SELECT jsonb_agg(f) FROM jsonb_array_elements(s->'functions') f
                WHERE f->'function'->>'schema' = 'progresspal_social')))
FROM hdb_catalog.hdb_metadata m, jsonb_array_elements(m.metadata::jsonb->'sources') s
WHERE s->>'name' = 'default';
