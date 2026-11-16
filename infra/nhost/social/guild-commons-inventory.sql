-- ProgressPal Guild provider inventory: READ-ONLY (catalog queries only, no learner rows).
WITH fn AS (
  SELECT p.oid, p.proname AS fname, pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'progresspal_social'
)
SELECT kind, object, detail FROM (
  SELECT 'function' AS kind, fname || '(' || args || ')' AS object,
    'body_sha256=' || encode(sha256(convert_to(replace(p.prosrc, E'\r\n', E'\n'), 'UTF8')), 'hex')
    || ' security=' || CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END
    || ' volatile=' || p.provolatile::text || ' config=' || coalesce(array_to_string(p.proconfig, ','), '-')
    || ' returns=' || pg_get_function_result(p.oid) AS detail
  FROM fn JOIN pg_proc p ON p.oid = fn.oid
  UNION ALL
  SELECT 'function-acl', fname || '(' || args || ')',
    coalesce((SELECT string_agg(CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END || ':' || a.privilege_type, ',' ORDER BY 1)
              FROM aclexplode(p.proacl) a WHERE a.grantee <> p.proowner), 'owner-only')
  FROM fn JOIN pg_proc p ON p.oid = fn.oid
  UNION ALL
  SELECT 'column', c.relname || '.' || a.attname,
    format_type(a.atttypid, a.atttypmod) || ' notnull=' || a.attnotnull
    || ' identity=' || coalesce(nullif(a.attidentity::text, ''), '-')
    || ' default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = 'progresspal_social' AND c.relkind = 'r'
  UNION ALL
  SELECT 'constraint', c.relname || '.' || k.conname, pg_get_constraintdef(k.oid)
  FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'progresspal_social'
  UNION ALL
  SELECT 'index', indexname, indexdef FROM pg_indexes WHERE schemaname = 'progresspal_social'
  UNION ALL
  SELECT 'trigger', c.relnamespace::regnamespace || '.' || c.relname || '.' || t.tgname,
    regexp_replace(pg_get_triggerdef(t.oid), '^CREATE TRIGGER \S+ ', '')
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace pn ON pn.oid = p.pronamespace
  WHERE NOT t.tgisinternal AND pn.nspname = 'progresspal_social'
  UNION ALL
  SELECT 'table-acl', c.relname,
    coalesce((SELECT string_agg(CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END || ':' || a.privilege_type, ',' ORDER BY 1)
              FROM aclexplode(c.relacl) a WHERE a.grantee <> c.relowner), 'owner-only')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'progresspal_social' AND c.relkind = 'r'
  UNION ALL
  SELECT 'schema-acl', nspname,
    coalesce((SELECT string_agg(CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END || ':' || a.privilege_type, ',' ORDER BY 1)
              FROM aclexplode(nspacl) a WHERE a.grantee <> nspowner), 'owner-only')
  FROM pg_namespace WHERE nspname = 'progresspal_social'
  UNION ALL
  SELECT 'owner', 'schema progresspal_social', pg_get_userbyid(nspowner)
  FROM pg_namespace WHERE nspname = 'progresspal_social'
  UNION ALL
  SELECT 'owner', 'function ' || fname, pg_get_userbyid(p.proowner)
  FROM fn JOIN pg_proc p ON p.oid = fn.oid
  UNION ALL
  SELECT 'owner', 'table ' || c.relname, pg_get_userbyid(c.relowner)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'progresspal_social' AND c.relkind = 'r'  UNION ALL
  SELECT 'session', 'current_user', current_user::text
  UNION ALL
  SELECT 'session', 'server_version', current_setting('server_version')
) inventory
ORDER BY kind, object;
