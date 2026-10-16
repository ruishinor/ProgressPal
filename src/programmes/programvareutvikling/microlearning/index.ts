import type { MicrolearningBank } from '@/lib/domain';

import { feilmeldingerSession } from './feilmeldinger';
import { programvareutviklingPrimers } from './primers';
import { tenkForstSession } from './tenkForst';
import { tenkSomEnUtviklerTrack } from './tenkSomEnUtvikler';
import { typerOgInputSession } from './typerOgInput';
import { variablerSession } from './variabler';

/**
 * Programvareutvikling's microlearning bank. «Repeter»: four short, ordered
 * reinforcement sessions drawn only from what M01 and M02 already teach.
 * «Forbered deg»: short primers for the missions a learner is about to meet
 * (see `primers.ts`). «Tenk som en utvikler»: a voluntary track, open
 * regardless of the Campaign (see `tenkSomEnUtvikler.ts`). Hand-authored and
 * deterministic; nothing here is scheduled, scored or stored.
 */
export const programvareutviklingMicrolearning: MicrolearningBank = {
  sessions: [
    variablerSession,
    typerOgInputSession,
    feilmeldingerSession,
    tenkForstSession,
  ],
  primers: programvareutviklingPrimers,
  tracks: [tenkSomEnUtviklerTrack],
};
