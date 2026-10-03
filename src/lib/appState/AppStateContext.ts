import { createContext } from 'react';

import type { SaveLearnerProfileInput } from '@/lib/db';
import type { AppMeta, LearnerProfile, ProgrammeScope } from '@/lib/domain';
import type {
  LocalCoordinationStatus,
  StoragePersistenceStatus,
} from '@/lib/storage';

export type AppStateStatus = 'error' | 'loading' | 'ready';

/**
 * One registered programme as Settings presents it (Epic C / C7): whether the
 * learner is enrolled and whether it is the active programme.
 */
export type ProgrammeChoice = {
  readonly active: boolean;
  readonly enrolled: boolean;
  readonly programmeId: string;
  readonly title: string;
};

export type AppStateContextValue = {
  appMeta: AppMeta | null;
  coordination: LocalCoordinationStatus;
  dataEpoch: number;
  /**
   * Enrols in a registered programme and makes it active in one persistence
   * transaction (Epic C / C7). Rejects, changing nothing, when the target is
   * unregistered or its catalogue cannot be prepared.
   */
  enrolAndSwitchProgramme: (programmeId: string) => Promise<void>;
  error: string | null;
  persistenceStatus: StoragePersistenceStatus;
  profile: LearnerProfile | null;
  /**
   * Every registered programme, in registry order, with its enrolment and
   * active state (Epic C / C7).
   */
  programmeChoices: readonly ProgrammeChoice[];
  /**
   * The active programme's runtime scope (Epic C / C5, C7). It derives from
   * the persisted `app_meta.activeProgrammeId` on every stable resolution and
   * is published together with the rest of the snapshot, so a page never sees
   * one programme's catalogue with another's policy or content. Until the
   * first resolution completes it is the default/bootstrap programme's scope
   * (used only by the loading shell); `null` only when composition failed,
   * which is an error state.
   */
  programmeScope: ProgrammeScope | null;
  refresh: () => Promise<void>;
  requestPersistentStorage: () => Promise<StoragePersistenceStatus>;
  runLocalMutation: <Result>(
    mutation: () => Promise<Result>,
    options?: { invalidateRoute?: boolean },
  ) => Promise<Result>;
  requiresOnboarding: boolean;
  saveProfile: (
    input: SaveLearnerProfileInput,
    options?: {
      completeOnboarding?: boolean;
      /**
       * A fresh learner's explicit programme choice (owner decision
       * 2026-10-03); ignored once onboarding is complete.
       */
      startingProgrammeId?: string;
    },
  ) => Promise<{
    appMeta: AppMeta;
    learnerProfile: LearnerProfile;
  }>;
  status: AppStateStatus;
  /**
   * Switches the active programme to an enrolled programme (Epic C / C7).
   * Rejects, changing nothing, when the target is unregistered, not
   * enrolled, or its catalogue cannot be prepared.
   */
  switchProgramme: (programmeId: string) => Promise<void>;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
