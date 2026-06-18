/**
 * Local, read-only CS50 study guide content.
 *
 * This module holds short, locally authored, plain-language summaries that help
 * a learner orient themselves around a week or a task. It is intentionally
 * static and import-only: there is no persistence, no learner-progress
 * mutation, and no network access. Official CS50 page links continue to be
 * handled separately by {@link file://./cs50Links.ts cs50Links}.
 *
 * Content is keyed to the stable unit and item IDs from the bundled course
 * seed. This is a representative first pass that covers Week 0 and Week 1 only;
 * missing entries for later weeks/items are expected and must resolve to
 * `null` gracefully.
 *
 * Authoring rules: locally written summaries only (no copied CS50 page text),
 * no problem-set solutions, and no walkthroughs that effectively reveal a
 * solution. Do not embed external URLs here.
 */

export type UnitGuide = {
  summary: string;
  whatToDo?: string[];
  doneLooksLike?: string[];
  reflectionPrompt?: string;
};

export type ItemGuide = {
  summary: string;
  whatToDo?: string[];
  doneLooksLike?: string[];
  checklist?: string[];
  reflectionPrompt?: string;
};

const unitGuides: Record<string, UnitGuide> = {
  'week-0': {
    summary:
      'Week 0 introduces computer-science thinking using Scratch, a drag-and-drop language. You focus on ideas like sequence, loops, conditions, and variables without worrying about typing code yet.',
    whatToDo: [
      'Watch the Week 0 lecture and follow along with the Scratch demos.',
      'Open Scratch and rebuild a small example to get comfortable with the blocks.',
      'Start Problem Set 0 once the core ideas feel familiar.',
    ],
    doneLooksLike: [
      'You can explain sequence, loops, and conditions in plain words.',
      'You have a working Scratch project that does something on purpose.',
      'Problem Set 0 is finished and submitted.',
    ],
    reflectionPrompt:
      'Which programming idea finally clicked for you this week, and what made it click?',
  },
  'week-1': {
    summary:
      'Week 1 moves from Scratch to C, a text-based language. The ideas are the same as Week 0, but now you write them as code and compile the program before you run it.',
    whatToDo: [
      'Watch the Week 1 lecture and retype the small examples yourself.',
      'Get comfortable compiling and running a simple program.',
      'Begin Problem Set 1 once printing and variables make sense.',
    ],
    doneLooksLike: [
      'You can write, compile, and run a small C program.',
      'You understand variables, types, and basic loops in C.',
      'Problem Set 1 is finished and submitted.',
    ],
    reflectionPrompt:
      'What felt different about writing code in C compared with building in Scratch?',
  },
};

const itemGuides: Record<string, ItemGuide> = {
  'week-0-lecture': {
    summary:
      'Lecture 0 is your first tour of how programs work, using Scratch so you can think about logic before syntax.',
    whatToDo: [
      'Watch in short sittings and pause to try each demo yourself.',
      'Note any new term so you can revisit it later.',
    ],
    doneLooksLike: [
      'You can describe what a loop and a conditional do.',
      'You feel ready to start building in Scratch.',
    ],
    checklist: [
      'Sequence and the order of steps',
      'Loops and repetition',
      'Conditions and branching',
      'Variables and simple events',
    ],
    reflectionPrompt:
      'What is one thing from the lecture you want to try yourself before moving on?',
  },
  'week-0-problem-set': {
    summary:
      'Problem Set 0 asks you to build your own Scratch project that uses the ideas from the lecture. It is meant to be playful, not a test of typing.',
    whatToDo: [
      'Pick a simple idea you actually want to build.',
      'Add at least one loop and one condition so your project reacts to something.',
      'Test it a few times and adjust until it behaves the way you expect.',
    ],
    doneLooksLike: [
      'Your project runs without getting stuck.',
      'It uses a loop and a condition on purpose.',
      'You submitted it where the course asks you to.',
    ],
    checklist: [
      'Project has a clear, small goal',
      'Uses at least one loop',
      'Uses at least one condition',
      'Tested and behaves as expected',
    ],
    reflectionPrompt:
      'Where did you submit it, and what would you add if you had more time?',
  },
  'week-1-lecture': {
    summary:
      'Lecture 1 connects the Scratch ideas you already know to real C syntax, including printing, variables, types, and loops.',
    whatToDo: [
      'Type the examples yourself instead of only watching.',
      'Run each small program so you can see the output change.',
    ],
    doneLooksLike: [
      'You can write a short program that prints output.',
      'You recognize common types and a basic loop.',
    ],
    checklist: [
      'Compiling and running a program',
      'Printing output',
      'Variables and types',
      'Loops and conditions in C',
    ],
    reflectionPrompt: 'Which Scratch idea mapped most cleanly onto C for you?',
  },
  'week-1-problem-set': {
    summary:
      'Problem Set 1 gives you small C programs to write so you can practice the basics: input, output, simple math, and loops.',
    whatToDo: [
      'Read each task slowly and restate it in your own words first.',
      'Build up your program in small steps and compile often.',
      'Check your output against the examples each task describes.',
    ],
    doneLooksLike: [
      'Each program compiles and runs.',
      'Your output matches what each task asks for.',
      'You submitted your work where the course asks you to.',
    ],
    checklist: [
      'Program compiles cleanly',
      'Handles the example inputs',
      'Output format matches the task',
      'Submitted where required',
    ],
    reflectionPrompt:
      'Where did you submit it, and which part took the most tries to get right?',
  },
};

export function getUnitGuide(unitId: string): UnitGuide | null {
  return unitGuides[unitId] ?? null;
}

export function getItemGuide(itemId: string): ItemGuide | null {
  return itemGuides[itemId] ?? null;
}
