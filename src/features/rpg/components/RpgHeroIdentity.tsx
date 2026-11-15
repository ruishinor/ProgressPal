import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { classNames } from '@/components/ui/utils';
import { ProfileAvatar } from '@/features/profile';
import guildEmblem from '@/features/rpg/assets/emblems/rpg-emblem-code-knights-primary.webp?inline';
import { RpgInfoNote } from '@/features/rpg/components/RpgInfoNote';
import { RpgRankBadge } from '@/features/rpg/components/RpgRankBadge';
import type { RpgHubIdentity } from '@/features/rpg/model/types';
import type { LearnerAvatarConfig } from '@/lib/domain';

type RpgHeroIdentityProps = {
  avatarConfig: LearnerAvatarConfig | null;
  guildHref?: string;
  guildName?: string | null;
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
  guildHref,
  guildName,
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
        <div className="rpg-identity__headline">
          <p
            className={classNames(
              'rpg-identity__name',
              variant === 'hud' && 'rpg-hero-hud__name',
            )}
          >
            {name}
          </p>
          {secondaryStatistic}
        </div>
        {showDetails && variant === 'profile' ? (
          <div className="action-row">
            <RpgRankBadge rank={identity.rankLabel} />
            <RpgInfoNote label="About rank">
              Rank follows how much of the required course you have completed.
            </RpgInfoNote>
          </div>
        ) : null}
        <dl className="rpg-identity__traits">
          <div className="rpg-identity__guild">
            <dt>Guild</dt>
            <dd>
              <img alt="" src={guildEmblem} width="32" height="32" />
              {guildHref ? (
                <NavLink
                  className="rpg-identity__guild-link"
                  end
                  to={guildHref}
                >
                  {guildName ?? identity.guildLabel}
                </NavLink>
              ) : (
                (guildName ?? identity.guildLabel)
              )}
            </dd>
          </div>
          <div className="rpg-identity__path">
            <dt>Path</dt>
            <dd>{identity.pathLabel}</dd>
          </div>
          {showDetails ? <IdentityClass label={identity.classLabel} /> : null}
          {showDetails && variant === 'hud' ? (
            <IdentityRank label={identity.rankLabel} />
          ) : null}
        </dl>
      </div>
    </div>
  );
}

/** The extended facts, wherever the shell places its secondary details. */
export function RpgHeroIdentityDetails({
  identity,
  programmeTitle,
}: {
  identity: RpgHubIdentity;
  programmeTitle?: string;
}) {
  return (
    <dl className="rpg-identity__traits rpg-identity__traits--details">
      {programmeTitle ? (
        <div className="rpg-identity__programme">
          <dt>Programme</dt>
          <dd>{programmeTitle}</dd>
        </div>
      ) : null}
      <IdentityClass label={identity.classLabel} />
      <IdentityRank label={identity.rankLabel} />
    </dl>
  );
}

function IdentityClass({ label }: { label: string }) {
  return (
    <div className="rpg-identity__class">
      <dt>Class</dt>
      <dd>{label}</dd>
    </div>
  );
}

function IdentityRank({ label }: { label: string }) {
  return (
    <div className="rpg-identity__rank">
      <dt>Rank</dt>
      <dd>{label}</dd>
    </div>
  );
}
