// Approved Guild of Moving Parts content. Input identity: docs/ACTIVITY_ACHIEVEMENTS_HANDOFF.md.
export const activityAchievementData = [
  {
    id: 'activity-hello-overworld',
    name: 'Hello, Overworld!',
    description: 'Record your first activity. Your lantern is ready to run.',
    condition:
      'At least one valid Activity entry on a date no later than today.',
    fiction:
      'Your character lights the Runlight Lantern and leaves the training hall as an adventurer.',
    unlock: 'Runlight lit. Adventure is now executing.',
    reward:
      'Runlight Lantern, commemorated by the badge; no equip action or stat modifier.',
    rule: 'first_entry',
    config: {
      minEntries: 1,
    },
    category: 'consistency',
  },
  {
    id: 'activity-push-to-main',
    name: 'Push to Main',
    description:
      'Log 32 push-ups across at least 3 days. The main branch has muscle.',
    condition:
      'Lifetime pushups/reps total >= 32, with pushups/reps recorded on at least 3 distinct eligible dates.',
    fiction:
      "Your character earns the Gauntlet of the Main Branch, strong enough to hold the guild's standard aloft.",
    unlock: 'Main branch reinforced. Nice push.',
    reward: 'Gauntlet of the Main Branch, illustrated recognition.',
    rule: 'activity_total_and_days',
    config: {
      activityId: 'pushups',
      unit: 'reps',
      minAmount: 32,
      minDates: 3,
    },
    category: 'consistency',
  },
  {
    id: 'activity-leg-day-compiler',
    name: 'Leg Day Compiler',
    description:
      'Compile 64 squats across at least 3 days. Forge a sturdier foundation.',
    condition:
      'Lifetime squats/reps total >= 64, with squats/reps recorded on at least 3 distinct eligible dates.',
    fiction:
      "The forge finishes your Foundation Greaves; your character's stance becomes the anchor of the party.",
    unlock: 'Compilation complete. Your stance has been upgraded.',
    reward: 'Foundation Greaves, commemorated in artwork.',
    rule: 'activity_total_and_days',
    config: {
      activityId: 'squats',
      unit: 'reps',
      minAmount: 64,
      minDates: 3,
    },
    category: 'consistency',
  },
  {
    id: 'activity-cache-me-outside',
    name: 'Cache Me Outside',
    description:
      "Log 5 km or 60 minutes of walking in total. There's treasure beyond the desk.",
    condition:
      'Lifetime walking/metres >= 5000 OR lifetime walking/seconds >= 3600. Each branch is counted separately.',
    fiction:
      "Your character discovers the Leafneedle Compass in a wayside cache and earns a first explorer's keepsake.",
    unlock: 'Cache found. Contents: one very good reason to wander.',
    reward:
      'Leafneedle Compass, a fictional discovery represented by the badge.',
    rule: 'activity_alternative_totals',
    config: {
      activityId: 'walking',
      alternatives: [
        {
          unit: 'metres',
          minAmount: 5000,
        },
        {
          unit: 'seconds',
          minAmount: 3600,
        },
      ],
    },
    category: 'consistency',
  },
  {
    id: 'activity-runtime-ranger',
    name: 'Runtime Ranger',
    description:
      "Log 10 km or 90 minutes of running across at least 3 days. Carry the guild's message.",
    condition:
      'Either running/metres total >= 10000 on >= 3 dates with running/metres, OR running/seconds total >= 5400 on >= 3 dates with running/seconds.',
    fiction:
      "Your character becomes a Runtime Ranger and is entrusted with the guild's windglass dispatch.",
    unlock: 'Dispatch entrusted. The road knows your runtime.',
    reward:
      'Windglass Dispatch and the narrative title Runtime Ranger; no class selector.',
    rule: 'activity_alternative_totals_and_days',
    config: {
      activityId: 'running',
      alternatives: [
        {
          unit: 'metres',
          minAmount: 10000,
          minDates: 3,
        },
        {
          unit: 'seconds',
          minAmount: 5400,
          minDates: 3,
        },
      ],
    },
    category: 'consistency',
  },
  {
    id: 'activity-cycle-of-power',
    name: 'Cycle of Power',
    description:
      'Log 25 km or 120 minutes of cycling across at least 3 days. Wake the wayfarer wheel.',
    condition:
      'Either cycling/metres total >= 25000 on >= 3 dates with cycling/metres, OR cycling/seconds total >= 7200 on >= 3 dates with cycling/seconds.',
    fiction:
      "Your character awakens the Wayfarer Wheel, a relic that once powered the guild's distant outposts.",
    unlock: 'Power cycle complete. The old wheel turns again.',
    reward: 'Awakened Wayfarer Wheel, commemorative artefact.',
    rule: 'activity_alternative_totals_and_days',
    config: {
      activityId: 'cycling',
      alternatives: [
        {
          unit: 'metres',
          minAmount: 25000,
          minDates: 3,
        },
        {
          unit: 'seconds',
          minAmount: 7200,
          minDates: 3,
        },
      ],
    },
    category: 'consistency',
  },
  {
    id: 'activity-full-stack-adventurer',
    name: 'Full Stack Adventurer',
    description: "Try 3 different activities. Fill your adventurer's toolkit.",
    condition:
      'At least 3 distinct activityId values among eligible entries. Built-ins and custom definitions count equally; measurement units do not create new types.',
    fiction:
      'Your character receives a field pack stocked for more than one kind of adventure.',
    unlock: 'Toolkit expanded. You are more than a one-button hero.',
    reward: 'Full Stack Field Pack, fictional kit only.',
    rule: 'distinct_activity_ids',
    config: {
      minDistinctActivities: 3,
    },
    category: 'consistency',
  },
  {
    id: 'activity-merge-quest',
    name: 'Merge Quest',
    description:
      'On one day, log 10 reps of one activity and 1 km or 10 minutes of another. Two branches. One quest.',
    condition:
      'On at least one eligible date d, some activity A totals >= 10 reps and a DIFFERENT activity B totals >= 1000 metres OR >= 600 seconds. Sum only the same date, activity and unit.',
    fiction:
      "Two training paths join and the guild's Merge Gate opens to your character.",
    unlock: 'Branches merged. A new gate opens.',
    reward: 'Merge Gate crest and a one-line story event; no world-map unlock.',
    rule: 'same_day_cross_unit_pair',
    config: {
      repsMin: 10,
      otherActivityAlternatives: [
        {
          unit: 'metres',
          minAmount: 1000,
        },
        {
          unit: 'seconds',
          minAmount: 600,
        },
      ],
      differentActivityIds: true,
    },
    category: 'consistency',
  },
  {
    id: 'activity-build-passed',
    name: 'Build Passed',
    description:
      'Meet all your enabled goals on 3 days. A build worthy of the guild.',
    condition:
      "At least 3 eligible dates with >= 1 entry, a saved ActivityDay goal snapshot containing >= 1 enabled goal, and every enabled snapshot goal meeting its target using that date's matching activityId/unit entries.",
    fiction:
      "The guild's forge approves three completed training plans and stamps your character's Build Seal.",
    unlock: 'Build passed. All planned systems green.',
    reward:
      'Guild Build Seal, represented by an emerald check forged over an anvil.',
    rule: 'snapshot_goal_days',
    config: {
      minDates: 3,
      minEnabledGoalsPerDate: 1,
      allEnabledGoalsRequired: true,
    },
    category: 'consistency',
  },
  {
    id: 'activity-fork-your-path',
    name: 'Fork Your Path',
    description:
      'Log one custom activity on 3 different days. Make your own trail.',
    condition:
      'At least one non-builtin ActivityDefinition ID has eligible entries on >= 3 distinct dates, in its supported unit. Historical entries remain eligible if that definition is archived.',
    fiction:
      'Your character carves a Trailfork Staff; the guild recognises a path that did not appear in its training manual.',
    unlock: 'Trail forked. This branch is yours.',
    reward: 'Trailfork Staff and narrative recognition.',
    rule: 'custom_activity_dates',
    config: {
      minDates: 3,
      sameCustomId: true,
    },
    category: 'consistency',
  },
  {
    id: 'activity-warm-reboot',
    name: 'Warm Reboot',
    description:
      'Return after 7 full days away, or log activity on 14 days in total. Your campfire remembers.',
    condition:
      'Either two adjacent distinct eligible activity dates have >= 7 full calendar dates with no eligible entries BETWEEN them (date difference >= 8), OR there are >= 14 distinct eligible activity dates.',
    fiction:
      "Your character's campfire flares up again. The adventure kept a place for you.",
    unlock: 'Welcome back to the fire. Your story still has its place.',
    reward: "Emberkeeper's Brazier, commemorative recognition.",
    rule: 'return_gap_or_active_days',
    config: {
      minFullInactiveDatesBetween: 7,
      alternativeActiveDates: 14,
    },
    category: 'recovery',
  },
  {
    id: 'activity-long-term-support',
    name: 'Long-Term Support',
    description:
      'Record activity on 42 different days. Become a pillar of the guild.',
    condition:
      'At least 42 distinct eligible activity dates, using any supported built-in or custom activity. Dates need not be consecutive.',
    fiction:
      'The guild names your character a Pillar of the Long Road and raises a living oak crest in their honour.',
    unlock:
      'Long-Term Support granted. The guild has roots because you returned.',
    reward:
      'Pillar of the Long Road title in narrative copy and the Living Oak Crest; no title-management UI.',
    rule: 'active_dates',
    config: {
      minDates: 42,
    },
    category: 'consistency',
  },
] as const;
