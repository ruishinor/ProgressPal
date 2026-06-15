# Time Utilities

Time and duration helpers now support the Module 10 content-detail route.

Current responsibilities:

- format saved second offsets into manual timestamp input strings
- parse `m:ss` and `h:mm:ss` route input back into whole seconds safely
- format whole study-session minutes for ledger and review copy
- derive whole saved minutes from elapsed live-session milliseconds

Still deferred:

- calendar or date-range utilities
- import or export timestamp normalization
