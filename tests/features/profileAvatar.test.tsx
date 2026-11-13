import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProfileAvatar } from '@/features/profile';
import { avatarOptions } from '@/features/profile/avatars';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { learnerAvatarIdValues } from '@/lib/domain';

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

  it('has 40 unique stable identities including Zero Cool and Dawson', () => {
    expect(avatarOptions).toHaveLength(40);
    expect(new Set(avatarOptions.map((option) => option.id)).size).toBe(40);
    expect(new Set(avatarOptions.map((option) => option.src)).size).toBe(40);
    expect(avatarOptions.map((option) => option.id)).toEqual([...learnerAvatarIdValues]);
    expect(avatarOptions.find((option) => option.id === 'hackers-dade')?.label).toBe('Zero Cool');
    expect(avatarOptions.find((option) => option.id === 'nerds-dawson')?.label).toBe('Dawson');
    expect(avatarOptions.find((option) => option.id === 'archetype-wildcard')?.src).toBe(
      '/assets/avatars/avatar-archetype-wildcard.png',
    );
  });

  it('offers named, keyboard-accessible avatar radio options without visible captions', () => {
    render(
      <ProfileForm
        mode="settings"
        onSubmit={async () => {}}
        profile={null}
        submitLabel="Save"
      />,
    );
    expect(screen.getByRole('radio', { name: 'Zero Cool' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dawson' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Wildcard' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Original' })).toBeChecked();
    expect(screen.getAllByRole('radio', { name: /.+/ }).length).toBeGreaterThanOrEqual(40);
  });
});
