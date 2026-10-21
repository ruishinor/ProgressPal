import type { MicroSource } from '@/lib/domain';

/**
 * Where a Scrum, Kanban or Smidig samarbeid activity comes from: the track,
 * and the authoring ID of the finalized ACT 18 package
 * (`Utviklerblikk-18-Final-Comparative-2026-10-21`, S01–S06, K01–K06,
 * A01–A06). The package names no curriculum skills; every activity cites the
 * curriculum's method skill, as Generelt's «Rolle, fase, oppgave eller
 * status?» does. Nothing reads skills from a track.
 */
export const source = (activity: string): MicroSource => ({
  moduleId: 'tenk-som-en-utvikler',
  lessonUnitIds: [`ACT18-${activity}`],
  skillIds: ['SK-METH-01'],
});
