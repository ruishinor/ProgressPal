import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';
import type { LearnerAvatarConfig } from '@/lib/domain';

import { normalizeAvatarConfig } from '@/features/profile/model';

const topPalette = {
  amber: {
    halo: '#f2e3bd',
    shirt: '#87601b',
  },
  clay: {
    halo: '#f2dfdb',
    shirt: '#8a4136',
  },
  forest: {
    halo: '#d8ebe5',
    shirt: '#1e6157',
  },
  ocean: {
    halo: '#dce8f2',
    shirt: '#335f87',
  },
} as const;

export type ProfileAvatarProps = HTMLAttributes<HTMLDivElement> & {
  avatarConfig: LearnerAvatarConfig | undefined;
  label?: string;
  size?: 'lg' | 'sm';
};

export function ProfileAvatar({
  avatarConfig,
  className,
  label = 'Learner avatar preview',
  size = 'lg',
  ...rest
}: ProfileAvatarProps) {
  const normalizedAvatar = normalizeAvatarConfig(avatarConfig);
  const palette = topPalette[normalizedAvatar.topColor];

  return (
    <div
      className={classNames(
        'profile-avatar',
        `profile-avatar--${size}`,
        className,
      )}
      {...rest}
    >
      <svg
        aria-label={label}
        role="img"
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" fill={palette.halo} r="56" />
        <path d="M28 110c2-20 16-32 32-32s30 12 32 32" fill={palette.shirt} />
        {normalizedAvatar.face === 'square' ? (
          <rect fill="#f1cfb4" height="46" rx="12" width="42" x="39" y="24" />
        ) : (
          <ellipse
            cx="60"
            cy="47"
            fill="#f1cfb4"
            rx={normalizedAvatar.face === 'round' ? 22 : 19}
            ry={normalizedAvatar.face === 'round' ? 24 : 28}
          />
        )}
        {normalizedAvatar.hair === 'short' ? (
          <path
            d="M32 47c5-21 17-31 28-31 12 0 24 10 28 31-6-7-15-11-28-11s-22 4-28 11Z"
            fill="#49352c"
          />
        ) : null}
        {normalizedAvatar.hair === 'curly' ? (
          <>
            <circle cx="41" cy="34" fill="#49352c" r="10" />
            <circle cx="54" cy="27" fill="#49352c" r="12" />
            <circle cx="69" cy="27" fill="#49352c" r="12" />
            <circle cx="81" cy="35" fill="#49352c" r="10" />
            <path d="M39 45h42v9H39z" fill="#49352c" />
          </>
        ) : null}
        {normalizedAvatar.hair === 'parted' ? (
          <path
            d="M31 48c4-20 16-31 29-31 7 0 14 3 20 9 4 4 8 12 10 22-7-8-16-12-27-12s-22 4-32 12Z"
            fill="#49352c"
          />
        ) : null}
        <circle cx="52" cy="46" fill="#1d2732" r="2.4" />
        <circle cx="68" cy="46" fill="#1d2732" r="2.4" />
        <path
          d="M52 59c2.5 3 6 4.5 8 4.5S66 62 68 59"
          fill="none"
          stroke="#8a4136"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </svg>
    </div>
  );
}
