export type SocialCommand =
  | { operation: 'read' }
  | { operation: 'leave' | 'invite' | 'revoke'; membership: string }
  | { operation: 'create'; name: string; nickname: string }
  | { operation: 'rename'; name: string; membership: string }
  | { operation: 'join'; code: string; nickname: string }
  | { operation: 'share'; days: string[]; membership: string };

export type SocialFailure =
  | 'unauthenticated'
  | 'already-member'
  | 'invalid-input'
  | 'invalid-code'
  | 'group-full'
  | 'no-group'
  | 'membership-changed'
  | 'not-admin'
  | 'invalid-days'
  | 'unavailable'
  | 'rate-limited';

export type SocialGroup = {
  name: string;
  membership: string;
  isAdmin: boolean;
  canInvite: boolean;
  hasInvite: boolean;
  members: { nickname: string; days: number; self: boolean }[];
};

export type SocialResult =
  | {
      status: 'ok';
      weekStart: string;
      group: SocialGroup | null;
      invite: string | null;
    }
  | { status: SocialFailure };

export interface SocialGroupPort {
  execute(
    command: SocialCommand,
    expectedUserId: string,
    signal: AbortSignal,
  ): Promise<SocialResult>;
}
