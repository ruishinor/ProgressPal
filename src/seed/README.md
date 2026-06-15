# Bundled Course Seed

This folder now contains the locally editable bundled CS50x course catalog.

Current responsibilities:

- store the first-party CS50x course seed payload checked against the official
  CS50 source
- validate that payload through the shared domain parser before the app uses it
- expose one public seed entrypoint for startup initialization and tests

Editing rules:

- keep the payload limited to the offline CS50x course catalog
- preserve unique IDs, explicit ordering, and required flags
- treat `estimatedMinutes` as local planning estimates, not official durations
- update `dataVersion` and `sourceCheckedDate` whenever the bundled payload is
  revised deliberately

Still deferred to later modules:

- user-facing import and export of seed or backup data
- explicit asset-level source URLs and verified official media durations
- any course-map UI, dashboard rollups, or destructive catalog reset flow
