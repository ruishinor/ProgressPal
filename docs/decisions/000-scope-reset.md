# ADR 000 - Scope Reset

- Date: 2026-06-11
- Status: accepted

## Context

ProgressPal started as a broad gamified tracker covering multiple domains, personas, and feature directions. That concept was too wide for a coherent offline MVP and too easy to derail into generic productivity software.

## Decision

ProgressPal CS50 Edition is an offline-only, single-user, local-first CS50 progression companion.

One-sentence description:
ProgressPal CS50 Edition helps one learner make CS50 progress visible through local progress tracking, partial-progress logging, XP, levels, achievements, and resume-aware study flow.

Natural endpoint:
Offline CS50 MVP.

## Removed Features

- Social features.
- Leaderboards.
- Sync.
- Three personas.
- Fitness tracking.
- Writing / thesis tracking.
- Financial categories.
- Health categories.
- Habit categories.
- Android-first target.
- External integrations.
- Cloud accounts.
- Remote analytics.
- AI coaching and recommendations.
- Generic multi-domain productivity scope.

## Retained Features

- Progress bars.
- XP.
- Levels.
- Achievements.
- Dashboard.
- Charts.
- Settings.
- Avatar.
- Responsive UI.
- Local persistence.
- Local backup and restore.

## Consequences

- The app must solve CS50 progression specifically, not generic motivation.
- Course data is seeded locally and editable locally; no scraping is required.
- Honest partial progress on long-form content is a core requirement, not a stretch feature.
- Module 00 remains documentation-only; implementation begins in Module 01.
