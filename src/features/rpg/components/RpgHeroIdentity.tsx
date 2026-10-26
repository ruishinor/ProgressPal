import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { classNames } from '@/components/ui/utils';
import { ProfileAvatar } from '@/features/profile';
import guildEmblem from '@/features/rpg/assets/emblems/rpg-emblem-code-knights-primary.webp?inline';
import { RpgInfoNote } from '@/features/rpg/components/RpgInfoNote';
import { RpgRankBadge } from '@/features/rpg/components/RpgRankBadge';
import type { RpgHubIdentity } from '@/features/rpg/model/types';
import type { LearnerAvatarConfig } from '@/lib/domain';

type RpgHeroIdentityProps = {
  avatarConfig: LearnerAvatarConfig | null;
  identity: RpgHubIdentity;
  name: string;
  /** When set, the avatar becomes the entry point to the Hero Profile. */
  profileHref?: string;
  secondaryStatistic?: ReactNode;
  showDetails?: boolean;
  variant?: 'hud' | 'profile';
};

/** One visual vocabulary for learner identity; all facts come from the read model. */
export function RpgHeroIdentity({
  avatarConfig,
  identity,
  name,
  profileHref,
  secondaryStatistic,
  showDetails = true,
  variant = 'hud',
}: RpgHeroIdentityProps) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'L';

  const portrait =
    avatarConfig === null ? (
      <div aria-hidden="true" className="rpg-identity__portrait">
        {initials}
      </div>
    ) : (
      <ProfileAvatar
        avatarConfig={avatarConfig}
        className="rpg-identity__portrait"
        label={`${name} hero avatar`}
        size="lg"
      />
    );

  return (
    <div className={classNames('rpg-identity', `rpg-identity--${variant}`)}>
      {profileHref === undefined ? (
        portrait
      ) : (
        <Link
          aria-label="Open Hero Profile"
          className="rpg-identity__profile-link"
          to={profileHref}
        >
          {portrait}
        </Link>
      )}
      <div className="rpg-identity__copy">
        <p
          className={classNames(
            'rpg-identity__name',
            variant === 'hud' && 'rpg-hero-hud__name',
          )}
        >
          {name}
        </p>
        {showDetails &&
          (variant === 'profile' ? (
            <div className="action-row">
              <RpgRankBadge rank={identity.rankLabel} />
              <RpgInfoNote label="About rank">
                Rank follows how much of the required course you have completed.
              </RpgInfoNote>
            </div>
          ) : (
            <RpgRankBadge rank={identity.rankLabel} />
          ))}
        {secondaryStatistic}
        {showDetails && <IdentityTraits identity={identity} />}
      </div>
    </div>
  );
}

/** The same read-model facts, wherever the shell places its secondary details. */
export function RpgHeroIdentityDetails({
  identity,
}: {
  identity: RpgHubIdentity;
}) {
  return (
    <>
      <RpgRankBadge rank={identity.rankLabel} />
      <IdentityTraits identity={identity} />
    </>
  );
}

function IdentityTraits({ identity }: { identity: RpgHubIdentity }) {
  return (
    <dl className="rpg-identity__traits">
      <div className="rpg-identity__guild">
        <dt>
          <img alt="" src={guildEmblem} width="32" height="32" />
          Guild
        </dt>
        <dd>{identity.guildLabel}</dd>
      </div>
      <div className="rpg-identity__class">
        <dt>Class</dt>
        <dd>{identity.classLabel}</dd>
      </div>
      <div className="rpg-identity__path">
        <dt>Path</dt>
        <dd>{identity.pathLabel}</dd>
      </div>
    </dl>
  );
}
