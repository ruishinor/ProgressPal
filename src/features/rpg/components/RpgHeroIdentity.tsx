import { useState } from 'react';
import { Link } from 'react-router-dom';

import { classNames } from '@/components/ui/utils';
import { ProfileAvatar } from '@/features/profile';
import guildEmblem from '@/features/rpg/assets/emblems/rpg-emblem-code-knights-primary.webp?inline';
import { RpgButton } from '@/features/rpg/components/RpgButton';
import { RpgRankBadge } from '@/features/rpg/components/RpgRankBadge';
import type { RpgHubIdentity } from '@/features/rpg/model/types';
import type { LearnerAvatarConfig } from '@/lib/domain';

type RpgHeroIdentityProps = {
  avatarConfig: LearnerAvatarConfig | null;
  identity: RpgHubIdentity;
  name: string;
  /** When set, the avatar becomes the entry point to the Hero Profile. */
  profileHref?: string;
  variant?: 'hud' | 'profile';
};

/**
 * The short explanation of Rank, behind an (i) next to it on the profile only:
 * the compact HUD and the profile page itself carry no recurring note.
 */
function RankInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <RpgButton
        aria-controls="rpg-rank-info"
        aria-expanded={open}
        aria-label="About rank"
        onClick={() => setOpen((current) => !current)}
        size="sm"
        variant="quiet"
      >
        (i)
      </RpgButton>
      {open ? (
        <p id="rpg-rank-info">
          Rank follows how much of the required course you have completed.
        </p>
      ) : null}
    </>
  );
}

/** One visual vocabulary for learner identity; all facts come from the read model. */
export function RpgHeroIdentity({
  avatarConfig,
  identity,
  name,
  profileHref,
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
        {variant === 'profile' ? (
          <div className="action-row">
            <RpgRankBadge rank={identity.rankLabel} />
            <RankInfo />
          </div>
        ) : (
          <RpgRankBadge rank={identity.rankLabel} />
        )}
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
      </div>
    </div>
  );
}
