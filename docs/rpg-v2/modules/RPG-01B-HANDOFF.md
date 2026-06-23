# RPG-01b Handoff — Profile Avatar Asset Patch

## Purpose

Replace the v1 generated profile avatar preview with a bundled RPG-style character profile asset before RPG-02 route work begins.

## Files changed

- `public/assets/character-profile.png`
- `src/features/profile/components/ProfileAvatar.tsx`
- `src/features/profile/components/ProfileForm.tsx`
- `src/features/profile/components/characterProfileAsset.ts`

## Important implementation detail

The avatar is imported from a generated inline data URL module instead of loaded from `/assets/character-profile.png` at runtime. This avoids offline navigation failures in the settings/profile route.

## Validation

- `npm run validate`: pass.
- Unit/integration: 36 files, 266 tests passed.
- E2E: 24 tests passed.
- Targeted offline E2E: pass.
- Circular dependency check: pass.
- Audit: 0 vulnerabilities.

## Known follow-up

The face shape, hair, and top color controls still persist avatar configuration but no longer affect the visible preview. This should be handled in a later profile/character customization module, not RPG-02.
