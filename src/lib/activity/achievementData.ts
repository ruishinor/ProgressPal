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
      'Log 200 push-ups across at least 3 days. The main branch has muscle.',
    condition:
      'Lifetime pushups/reps total >= 200, with pushups/reps recorded on at least 3 distinct eligible dates.',
    fiction:
      "The guild terminal flashes 200 OK. Your character claims the Gauntlet of the Main Branch and raises the guild's standard.",
    unlock: '200 OK. Main branch reinforced. Nice push.',
    reward: 'Gauntlet of the Main Branch, illustrated recognition.',
    rule: 'activity_total_and_days',
    config: {
      activityId: 'pushups',
      unit: 'reps',
      minAmount: 200,
      minDates: 3,
    },
    category: 'consistency',
  },
  {
    id: 'activity-leg-day-compiler',
    name: 'Leg Day Compiler',
    description:
      'Compile 404 squats across at least 4 days. Forge a sturdier foundation.',
    condition:
      'Lifetime squats/reps total >= 404, with squats/reps recorded on at least 4 distinct eligible dates.',
    fiction:
      'The forge returns 404: Weak Foundation Not Found. Your character claims the newly compiled Foundation Greaves, ready to anchor the party.',
    unlock:
      '404: Weak foundation not found. Greaves compiled. Your stance has been upgraded.',
    reward: 'Foundation Greaves, commemorated in artwork.',
    rule: 'activity_total_and_days',
    config: {
      activityId: 'squats',
      unit: 'reps',
      minAmount: 404,
      minDates: 4,
    },
    category: 'consistency',
  },
  {
    id: 'activity-cache-me-outside',
    name: 'Cache Me Outside',
    description:
      "Log 16 km or 192 minutes of walking in total. There's treasure beyond the desk.",
    condition:
      'Lifetime walking/metres >= 16000 OR lifetime walking/seconds >= 11520. Each branch is counted separately.',
    fiction:
      'The Leafneedle Compass flickers to life. Across its display, an address appears: 192.168.0.16. Following the signal, your character discovers a forgotten cache beyond the training hall.',
    unlock: "Explorer's cache found. Contents: one very good reason to wander.",
    reward:
      'Leafneedle Compass, a fictional discovery represented by the badge.',
    rule: 'activity_alternative_totals',
    config: {
      activityId: 'walking',
      alternatives: [
        {
          unit: 'metres',
          minAmount: 16000,
        },
        {
          unit: 'seconds',
          minAmount: 11520,
        },
      ],
    },
    category: 'consistency',
  },
  {
    id: 'activity-runtime-ranger',
    name: 'Runtime Ranger',
    description:
      "Log 42 km or 252 minutes of running across at least 7 days. Carry the guild's message.",
    condition:
      'Either running/metres total >= 42000 on >= 7 dates with running/metres, OR running/seconds total >= 15120 on >= 7 dates with running/seconds.',
    fiction:
      "The guild entrusts your character with the Windglass Dispatch, stamped with the number 42. The route is long, the answer uncertain, but one thing is clear: don't forget your towel. Your character becomes a Runtime Ranger.",
    unlock: "42. Don't panic. Dispatch entrusted.",
    reward:
      'Windglass Dispatch and the narrative title Runtime Ranger; no class selector.',
    rule: 'activity_alternative_totals_and_days',
    config: {
      activityId: 'running',
      alternatives: [
        {
          unit: 'metres',
          minAmount: 42000,
          minDates: 7,
        },
        {
          unit: 'seconds',
          minAmount: 15120,
          minDates: 7,
        },
      ],
    },
    category: 'consistency',
  },
  {
    id: 'activity-cycle-of-power',
    name: 'Cycle of Power',
    description:
      'Log 64 km or 192 minutes of cycling across at least 4 days. Wake the wayfarer wheel.',
    condition:
      'Either cycling/metres total >= 64000 on >= 4 dates with cycling/metres, OR cycling/seconds total >= 11520 on >= 4 dates with cycling/seconds.',
    fiction:
      "Deep within the guild's forgotten machinery, a 64-bit core begins to hum. Your character awakens the Wayfarer Wheel - a relic that once powered the guild's distant outposts - sending power to them once more.",
    unlock:
      'Power cycle complete. 64-bit core online. The old wheel turns again.',
    reward: 'Awakened Wayfarer Wheel, commemorative artefact.',
    rule: 'activity_alternative_totals_and_days',
    config: {
      activityId: 'cycling',
      alternatives: [
        {
          unit: 'metres',
          minAmount: 64000,
          minDates: 4,
        },
        {
          unit: 'seconds',
          minAmount: 11520,
          minDates: 4,
        },
      ],
    },
    category: 'consistency',
  },
  {
    id: 'activity-full-stack-adventurer',
    name: 'Full Stack Adventurer',
    description: "Try 5 different activities. Fill your adventurer's toolkit.",
    condition:
      'At least 5 distinct activityId values among eligible entries. Built-ins and custom definitions count equally; measurement units do not create new types.',
    fiction:
      'Five paths converge like layers of an ancient communication stack. You receive the Full Stack Field Pack; From the physical world to the application, your character is ready for whatever comes next.',
    unlock:
      'Five layers connected. Toolkit expanded. Full stack equipped. You are more than a one-button hero.',
    reward: 'Full Stack Field Pack, fictional kit only.',
    rule: 'distinct_activity_ids',
    config: {
      minDistinctActivities: 5,
    },
    category: 'consistency',
  },
  {
    id: 'activity-merge-quest',
    name: 'Merge Quest',
    description:
      'On one day, log 101 reps of one activity and 10 km or 100 minutes of another. Two branches. One quest.',
    condition:
      'On at least one eligible date d, some activity A totals >= 101 reps and a DIFFERENT activity B totals >= 10000 metres OR >= 6000 seconds. Sum only the same date, activity and unit.',
    fiction:
      'The guild console flashes 101 Switching Protocols. Two training paths converge, and the ancient Merge Gate opens before your character.',
    unlock: '101: Switching Protocols. Merge complete.',
    reward: 'Merge Gate crest and a one-line story event; no world-map unlock.',
    rule: 'same_day_cross_unit_pair',
    config: {
      repsMin: 101,
      otherActivityAlternatives: [
        {
          unit: 'metres',
          minAmount: 10000,
        },
        {
          unit: 'seconds',
          minAmount: 6000,
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
      'Meet all your enabled Activity goals on 7 different days. Seven layers. One complete build worthy of the guild.',
    condition:
      'Meet every enabled Activity goal on at least 7 distinct days. Each qualifying day must have at least one enabled goal and a recorded activity entry. Days do not need to be consecutive or within the same week.',
    fiction:
      "With each successful day, another layer lights up on the guild's ancient forge display. From Physical to Application, the stack comes online. On the seventh, every layer glows green, and the forge stamps your character's Build Seal.",
    unlock: 'Seven layers online. Build passed. All systems green.',
    reward:
      'Guild Build Seal, represented by an emerald check forged over an anvil.',
    rule: 'snapshot_goal_days',
    config: {
      minDates: 7,
      minEnabledGoalsPerDate: 1,
      allEnabledGoalsRequired: true,
    },
    category: 'consistency',
  },
  {
    id: 'activity-fork-your-path',
    name: 'Fork Your Path',
    description:
      'Log one custom activity on 8 different days. Make your own trail.',
    condition:
      'At least one non-builtin ActivityDefinition ID has eligible entries on >= 8 distinct dates, in its supported unit. Historical entries remain eligible if that definition is archived.',
    fiction:
      'The guild carves eight marks into your Trailfork Staff. Byte by byte, a path that began as a single idea becomes your own. The guild recognises a path that did not appear in its training manual.',
    unlock: 'One byte of history. Your path, this branch is yours.',
    reward: 'Trailfork Staff and narrative recognition.',
    rule: 'custom_activity_dates',
    config: {
      minDates: 8,
      sameCustomId: true,
    },
    category: 'consistency',
  },
  {
    id: 'activity-warm-reboot',
    name: 'Warm Reboot',
    description:
      'Return after 3 full days away, or log activity on 11 days in total. Your campfire remembers.',
    condition:
      'Return to activity after at least 3 consecutive full calendar days without any eligible activity entries, regardless of weekday or weekend. Alternatively, record activity on at least 11 distinct dates.',
    fiction:
      "The guild's old console remembers two commands: the three-key salute after a long silence, or a dial turned all the way to eleven. Either brings the Emberkeeper's Brazier roaring back to life. Your character's campfire flares up again.",
    unlock: 'Reboot complete. The campfire goes to eleven. Welcome back.',
    reward: "Emberkeeper's Brazier, commemorative recognition.",
    rule: 'return_gap_or_active_days',
    config: {
      minFullInactiveDatesBetween: 3,
      alternativeActiveDates: 11,
    },
    category: 'recovery',
  },
  {
    id: 'activity-long-term-support',
    name: 'Long-Term Support',
    description:
      'Record activity on 20 different days. Become a pillar of the guild.',
    condition:
      'At least 20 distinct eligible activity dates, using any supported built-in or custom activity. Dates need not be consecutive.',
    fiction:
      "At the twentieth mark, the guild's great die lands on a natural 20. Your character is named Pillar of the Long Road, and the Living Oak Crest is raised in their honour.",
    unlock: 'Natural 20. Long-Term Support unlocked.',
    reward:
      'Pillar of the Long Road title in narrative copy and the Living Oak Crest; no title-management UI.',
    rule: 'active_dates',
    config: {
      minDates: 20,
    },
    category: 'consistency',
  },
] as const;

/**
 * ============================================================================
 * EASTER EGG & LORE REFERENCE GUIDE (ELI5 EDITION)
 * ============================================================================
 * Developer reference for the mathematical, scientific, programming,
 * networking, gaming and geek-culture Easter eggs in Activity achievements.
 *
 * Numerical references are thematic, not additional unlock conditions.
 * The actual requirements are defined by each achievement's rule and config.
 *
 * 1. Hello, Overworld! (`activity-hello-overworld`)
 *    - Value: 1 recorded activity.
 *    - Lore: "Hello, World!" and binary 1.
 *    - ELI5: "Hello, World!" is traditionally a programmer's first
 *      program. A binary 1 represents an active or set bit.
 *      The first activity switches the adventurer's journey ON.
 *
 * 2. Push to Main (`activity-push-to-main`)
 *    - Values: 200 push-ups across at least 3 distinct days.
 *    - Lore: HTTP 200 OK and the TCP three-way handshake.
 *    - ELI5: HTTP 200 means a web request succeeded.
 *      TCP establishes a connection using three steps:
 *      SYN, SYN-ACK and ACK.
 *      The guild terminal celebrates a successful connection
 *      with "200 OK" as the Main Branch is reinforced.
 *    - Note: The TCP handshake is not a Git merge requirement.
 *
 * 3. Leg Day Compiler (`activity-leg-day-compiler`)
 *    - Values: 404 squats across at least 4 distinct days.
 *    - Lore: HTTP 404 Not Found and the 4-bit nibble.
 *    - ELI5: HTTP 404 means a requested resource was not found.
 *      Four bits make one nibble, or half a byte.
 *      "404: Weak Foundation Not Found" turns a familiar error
 *      into a joke about the character's upgraded foundation.
 *
 * 4. Cache Me Outside (`activity-cache-me-outside`)
 *    - Values: 16 km OR 192 minutes of walking.
 *    - Lore: Hexadecimal (base 16) and private IPv4 addresses.
 *    - Reference: 0x10 = 16; 192.168.0.16.
 *    - ELI5: Hexadecimal uses sixteen symbols, 0 through F.
 *      Addresses beginning with 192.168 are common on home
 *      and other private networks.
 *      The Leafneedle Compass displays 192.168.0.16,
 *      combining the two milestone numbers into a clue.
 *    - Math: At 5 km/h, 16 km takes exactly 192 minutes.
 *    - Gameplay: Distance and duration are separate alternatives.
 *      They are not automatically converted or added together.
 *
 * 5. Runtime Ranger (`activity-runtime-ranger`)
 *    - Values: 42 km or 252 minutes (15,120 seconds) across at least 7 distinct days.
 *    - Lore: "The Hitchhiker's Guide to the Galaxy;
 *      the Answer to Life, the Universe, and Everything".
 *      "Don't Panic" and remembering your towel are
 *      references to the same fictional universe.
 *      It is also a reference to the length of a real marathon in km.
 *    - ELI5: In Douglas Adams' science-fiction series,
 *      42 is the ultimate answer to life, the universe, and everything.
 *      It is also a reference to the length of a marathon - 42 (.195) km.
 *      At a 10 km/h running pace, 42 km takes 252 minutes.
 *
 * 6. Cycle of Power (`activity-cycle-of-power`)
 *    - Values: 64 km OR 192 minutes of cycling,
 *      across at least 4 distinct days.
 *    - Lore: 64-bit computer architecture.
 *    - ELI5: A 64-bit processor architecture uses 64-bit
 *      values for key operations and addressing.
 *      The guild's ancient 64-bit core powers the Wayfarer Wheel,
 *      restoring energy to distant outposts.
 *    - Math: At 20 km/h, 64 km takes exactly 192 minutes.
 *    - Gameplay: Distance and duration are separate alternatives,
 *      each requiring activity on at least 4 distinct dates.
 *
 * 7. Full Stack Adventurer (`activity-full-stack-adventurer`)
 *    - Value: 5 distinct activity types.
 *    - Lore: The five-layer Internet protocol stack model.
 *    - Layers: Physical, Data Link, Network, Transport,
 *      and Application.
 *    - ELI5: One common teaching model describes network
 *      communication through five cooperating layers.
 *      Five different activities represent a versatile,
 *      connected toolkit: the Full Stack Field Pack.
 *    - Note: TCP/IP is also commonly represented using
 *      four layers; this Easter egg uses the five-layer model.
 *      Built-in and custom activities both qualify.
 *
 * 8. Merge Quest (`activity-merge-quest`)
 *    - Values: 101 reps of one activity AND either 10 km
 *      or 100 minutes of a different activity on the same day.
 *    - Lore: HTTP 101 Switching Protocols, CS 101,
 *      and Git branch merging.
 *    - ELI5: HTTP 101 indicates that a server is switching
 *      protocols in response to an agreed upgrade request.
 *      CS 101 commonly names an introductory computer science
 *      course. Git merges combine branches of development.
 *      Two distinct activity paths converge at the Merge Gate.
 *    - Gameplay: Both requirements must be met on the same
 *      eligible date, using different activity identities.
 *
 * 9. Build Passed (`activity-build-passed`)
 *    - Value: 7 distinct days with every enabled goal met.
 *    - Lore: The OSI networking model's seven layers.
 *    - Layers: Physical (1), Data Link (2), Network (3),
 *      Transport (4), Session (5), Presentation (6),
 *      and Application (7).
 *    - ELI5: The OSI model explains network communication
 *      using seven layers. Each successful goal-day lights
 *      another layer on the guild's ancient forge display.
 *      When all seven layers are online, the build passes
 *      and the character receives the Guild Build Seal.
 *    - Gameplay: Each qualifying date needs recorded activity,
 *      at least one enabled saved goal, and all enabled goals
 *      met. Dates need not be consecutive or within one week.
 *
 * 10. Fork Your Path (`activity-fork-your-path`)
 *     - Values: The same custom activity on 8 distinct days.
 *     - Lore: Eight bits in one byte and Git forking.
 *     - ELI5: A byte contains eight bits.
 *       In Git hosting, a fork is a separate copy of a
 *       repository that can develop along its own path.
 *       Eight marks on the Trailfork Staff form one byte
 *       of history, representing a self-created activity path.
 *     - Gameplay: The same custom activity must appear on
 *       at least 8 different eligible dates.
 *
 * 11. Warm Reboot (`activity-warm-reboot`)
 *     - Values: Return after 3 consecutive full inactive
 *       calendar days OR record activity on 11 distinct days.
 *     - Lore: Ctrl+Alt+Delete, the three-key salute,
 *       and "turn it up to eleven" from This Is Spinal Tap.
 *     - ELI5: Ctrl+Alt+Delete is a famous three-key Windows
 *       command associated with accessing system controls
 *       and, historically, restarting a computer.
 *       "Turn it up to eleven" means going beyond the usual
 *       maximum, originally from a fictional amplifier.
 *       Either route reignites the Emberkeeper's Brazier.
 *     - Gameplay: The return route requires three complete
 *       consecutive calendar dates without eligible activity
 *       between two active dates. Weekdays do not matter.
 *       The 11-day alternative requires no inactivity gap.
 *
 * 12. Long-Term Support (`activity-long-term-support`)
 *     - Value: Activity on 20 distinct days.
 *     - Lore: Natural 20 on a twenty-sided RPG die (D20)
 *       and Long-Term Support (LTS) software releases.
 *     - ELI5: Rolling a natural 20 means the die itself
 *       shows 20 before any modifiers are applied.
 *       In Dungeons & Dragons, it scores a critical hit
 *       on an attack roll.
 *       LTS software releases receive extended maintenance.
 *       The guild celebrates the twentieth active day
 *       as a critical milestone in long-term participation.
 *     - Gameplay: The 20 active dates need not be consecutive.
 *
 * ============================================================================
 */
