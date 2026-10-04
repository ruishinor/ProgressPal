import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfileAvatar } from '@/features/profile';

describe('ProfileAvatar asset selection', () => {
  it('keeps legacy configs on the original character', () => {
    render(
      <ProfileAvatar
        avatarConfig={{ face: 'round', hair: 'short', topColor: 'forest' }}
        label="Legacy avatar"
      />,
    );

    const avatar = screen.getByRole('img', { name: 'Legacy avatar' });
    expect(avatar).toHaveAttribute('data-avatar-id', 'original');
    expect(avatar.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/character-profile.png',
    );
  });

  it('renders a persisted additional avatar identity', () => {
    render(
      <ProfileAvatar
        avatarConfig={{
          avatarId: 'wavy-bob',
          face: 'round',
          hair: 'short',
          topColor: 'forest',
        }}
        label="Selected avatar"
      />,
    );

    const avatar = screen.getByRole('img', { name: 'Selected avatar' });
    expect(avatar).toHaveAttribute('data-avatar-id', 'wavy-bob');
    expect(avatar.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/avatars/avatar-wavy-bob.png',
    );
  });
});
