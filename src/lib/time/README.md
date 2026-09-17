# Time Utilities

Time and duration helpers support study input and local activity summaries.

Current responsibilities:

- format saved second offsets into manual timestamp input strings
- parse `m:ss` and `h:mm:ss` route input back into whole seconds safely
- format whole study-session minutes for ledger and review copy
- derive whole saved minutes from elapsed live-session milliseconds
- format device-local dates and derive Monday week starts for Insights and RPG
  summaries; callers advance local calendar dates rather than assuming 168-hour
  weeks across daylight saving changes

Still deferred:

- import or export timestamp normalization
