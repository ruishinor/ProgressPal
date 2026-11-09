# Ordinary interface wording

Edit **`interface.json`** to change existing approved UI text. Search for the current wording, then edit the value only. Keep property names, structure and `{placeholders}` unchanged. React renders these strings as text, not HTML. The catalogue is built into the same-origin application; it is not fetched from an external service.

For local preview, use the existing `npm run dev` command and open the relevant Classic, RPG or Pathways route. A published revision is an ordinary Git commit/PR changing only `src/ui-copy/interface.json`. A revert restores the previous value in that same file. The lightweight COPY gate is designed to run structural checks, formatting, production build and bundle budget; it must not run the functional regression suites for such an edit.

Changing keys, adding text not yet catalogued, changing JSX/TSX, content schemas, assessments, curriculum, runtime behavior, security/privacy promises or release controls is **not** a copy-only change. Those changes retain the full certification process. An existing key's wording can still misinform users; the owner remains responsible for factual and educational accuracy. Avoid changing warnings, instructions or legal/policy claims without appropriate review.

The initial migration covers static JSX text, selected presentation attributes and direct conditional display strings across 48 source files. Dynamic templates, lesson/assessment content, microlearning, programme-owned boundary text and other embedded strings remain outside the catalogue. This is substantial coverage but **not** evidence of 100% arbitrary-copy support. Reconcile the remaining ordinary UI strings in a subsequent independently reviewed infrastructure change if needed; never extend the COPY allowlist simply to evade review.

Progress-status definitions and nonessential mechanics explanations belong in contextual, opt-in information controls rather than persistent page copy. Essential warnings, errors, accessible names and actual educational explanations must remain available without unnecessary disclosure steps.
