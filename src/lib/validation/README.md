# Validation Utilities

Module 03 adds generic runtime validation helpers here.

Keep this layer shared and domain-agnostic. Domain-specific schemas belong under
`src/lib/domain/`, while later backup and import workflows can reuse the parsing
helpers from this directory.
