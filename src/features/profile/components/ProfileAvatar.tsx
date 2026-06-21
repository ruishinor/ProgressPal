import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';
import type { LearnerAvatarConfig } from '@/lib/domain';

import { CHARACTER_PROFILE_ASSET } from '@/features/profile/components/characterProfileAsset';

export type ProfileAvatarProps = HTMLAttributes<HTMLDivElement> & {
  avatarConfig: LearnerAvatarConfig | undefined;
  label?: string;
  size?: 'lg' | 'sm';
};

export function ProfileAvatar({
  avatarConfig,
  className,
  label = 'Character profile avatar',
  size = 'lg',
  ...rest
}: ProfileAvatarProps) {
  const avatarSource = avatarConfig === undefined ? 'default' : 'configured';

  return (
    <div
      aria-label={label}
      className={classNames(
        'profile-avatar',
        'profile-avatar--asset',
        `profile-avatar--${size}`,
        className,
      )}
      data-avatar-source={avatarSource}
      role="img"
      {...rest}
    >
      <img
        alt=""
        aria-hidden="true"
        src={CHARACTER_PROFILE_ASSET}
        style={{
          display: 'block',
          height: '100%',
          objectFit: 'cover',
          width: '100%',
        }}
      />
    </div>
  );
}
