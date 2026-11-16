/** Private Guild Commons — deliberately separate from the existing social_week contract. */
export type GuildNoteKind = 'help' | 'offer' | 'notice' | 'win';

export type GuildCommonsCommand =
  | { operation: 'read'; membership: string }
  | { operation: 'profile'; membership: string; ethos: string; about: string }
  | { operation: 'focus'; membership: string; text: string }
  | { operation: 'post'; membership: string; kind: GuildNoteKind; body: string }
  | { operation: 'edit'; membership: string; note: string; body: string }
  | { operation: 'remove' | 'resolve'; membership: string; note: string }
  | { operation: 'transfer'; membership: string; target: string };

export type GuildCommonsFailure =
  | 'unauthenticated'
  | 'membership-changed'
  | 'no-group'
  | 'not-admin'
  | 'not-owner'
  | 'not-found'
  | 'invalid-input'
  | 'already-posted'
  | 'full'
  | 'rate-limited'
  | 'unavailable';

export type GuildCommonsGroup = {
  ethos: string;
  about: string;
  isAdmin: boolean;
  members: { nickname: string; membership: string; self: boolean }[];
  notes: {
    id: string;
    kind: GuildNoteKind;
    body: string;
    author: string;
    createdAt: string;
    own: boolean;
    canRemove: boolean;
  }[];
};

/** The current Oslo week's focus; an empty text means none is set. */
export type GuildFocus = { text: string; weekStart: string };

/**
 * `focus` sits beside `group` so S1 clients, which parse `group` strictly,
 * ignore it. It is absent when the provider predates the weekly focus.
 */
export type GuildCommonsResult =
  | { status: 'ok'; group: GuildCommonsGroup; focus?: GuildFocus }
  | { status: GuildCommonsFailure };

export interface GuildCommonsPort {
  execute(
    command: GuildCommonsCommand,
    expectedUserId: string,
    signal: AbortSignal,
  ): Promise<GuildCommonsResult>;
}
