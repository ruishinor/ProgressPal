import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type {
  GuildCommonsCommand,
  GuildCommonsGroup,
  GuildCommonsResult,
} from '@/lib/cloud';

const execute = vi.hoisted(() =>
  vi.fn<
    (
      command: GuildCommonsCommand,
      userId: string,
      signal: AbortSignal,
    ) => Promise<GuildCommonsResult>
  >(),
);
vi.mock('@/lib/cloud', async (original) => ({
  ...(await original<typeof import('@/lib/cloud')>()),
  getGuildCommons: () => ({ execute }),
}));

const { GuildCommons } = await import('@/features/social/GuildCommons');

const membership = 'ab4d2826-20ad-4ee9-80ef-6bf725e82999';
const peer = 'bb4d2826-20ad-4ee9-80ef-6bf725e82999';
const own = 'aa4d2826-20ad-4ee9-80ef-6bf725e82999';
const theirs = 'ca4d2826-20ad-4ee9-80ef-6bf725e82999';

function board(overrides: Partial<GuildCommonsGroup> = {}): GuildCommonsGroup {
  return {
    ethos: '',
    about: '',
    isAdmin: false,
    members: [
      { nickname: 'Ada', membership, self: true },
      { nickname: 'Bo', membership: peer, self: false },
    ],
    notes: [
      {
        id: theirs,
        kind: 'offer',
        body: 'Jeg kan hjelpe med løkker.',
        author: 'Bo',
        createdAt: '2026-11-12T23:30:00Z',
        own: false,
        canRemove: false,
      },
    ],
    ...overrides,
  };
}

const ok = (group: GuildCommonsGroup): GuildCommonsResult => ({
  status: 'ok',
  group,
});

function mount(onMembershipChanged = vi.fn()) {
  render(
    <GuildCommons
      membership={membership}
      onMembershipChanged={onMembershipChanged}
      rpg={false}
      userId="user-1"
    />,
  );
  return onMembershipChanged;
}

async function open(group: GuildCommonsGroup) {
  execute.mockResolvedValueOnce(ok(group));
  fireEvent.click(screen.getByRole('button', { name: 'Åpne Guild-fellesrom' }));
  await screen.findByRole('region', { name: 'Guild-oppslag' });
}

afterEach(() => execute.mockReset());

it('reads nothing until opened, then shows each note with its author and Oslo date', async () => {
  mount();
  expect(execute).not.toHaveBeenCalled();

  await open(board());

  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute.mock.calls[0]?.[0]).toEqual({ operation: 'read', membership });
  expect(execute.mock.calls[0]?.[1]).toBe('user-1');
  const note = screen.getByRole('listitem');
  expect(note).toHaveTextContent('Bo');
  // 23:30 UTC on 12 November is 13 November in Oslo.
  expect(note.querySelector('time')).toHaveAttribute(
    'datetime',
    '2026-11-12T23:30:00Z',
  );
  expect(note.querySelector('time')).toHaveTextContent('13');
  // A member can neither remove someone else's note nor administer the Guild.
  expect(screen.queryByRole('button', { name: 'Fjern' })).toBeNull();
  expect(screen.queryByText('Rediger Guild-profil')).toBeNull();
  expect(screen.queryByText('Overfør administratorrollen')).toBeNull();
});

it('posts a trimmed note of the chosen kind and then offers no second post', async () => {
  mount();
  await open(board());

  fireEvent.click(screen.getByText('Skriv et oppslag'));
  fireEvent.change(screen.getByLabelText('Type oppslag'), {
    target: { value: 'help' },
  });
  fireEvent.change(screen.getByLabelText('Beskjed'), {
    target: { value: '  Hvordan virker git merge?\n ' },
  });
  execute.mockResolvedValueOnce(
    ok(
      board({
        notes: [
          ...board().notes,
          {
            id: own,
            kind: 'help',
            body: 'Hvordan virker git merge?',
            author: 'Ada',
            createdAt: '2026-11-13T08:00:00Z',
            own: true,
            canRemove: true,
          },
        ],
      }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Del oppslag' }));

  await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
  expect(execute.mock.calls[1]?.[0]).toEqual({
    operation: 'post',
    membership,
    kind: 'help',
    body: 'Hvordan virker git merge?',
  });
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Guild-fellesrom' }),
    ).toHaveFocus(),
  );
  expect(screen.queryByText('Skriv et oppslag')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Marker som løst' }),
  ).toBeInTheDocument();
});

it('asks before handing over the administrator role and refreshes membership after', async () => {
  const changed = mount();
  await open(board({ isAdmin: true }));

  fireEvent.click(screen.getByText('Overfør administratorrollen'));
  fireEvent.click(screen.getByRole('button', { name: 'Gå videre' }));
  expect(execute).toHaveBeenCalledTimes(1);

  execute.mockResolvedValueOnce(ok(board()));
  fireEvent.click(
    screen.getByRole('button', { name: 'Ja, overfør administratorrollen' }),
  );

  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(execute.mock.calls[1]?.[0]).toEqual({
    operation: 'transfer',
    membership,
    target: peer,
  });
  expect(screen.queryByText('Overfør administratorrollen')).toBeNull();
});

it('drops the board when the membership has changed', async () => {
  mount();
  await open(board());

  execute.mockResolvedValueOnce({ status: 'membership-changed' });
  fireEvent.click(screen.getByRole('button', { name: 'Oppdater fellesrom' }));

  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'Guild-oppslag' })).toBeNull(),
  );
  expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
});

it('aborts an unfinished read on close and ignores its late answer', async () => {
  mount();
  let answer: (result: GuildCommonsResult) => void = () => undefined;
  execute.mockImplementationOnce(
    () => new Promise((resolve) => (answer = resolve)),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Åpne Guild-fellesrom' }));
  const signal = execute.mock.calls[0]?.[2];

  fireEvent.click(screen.getByRole('button', { name: 'Lukk' }));
  expect(signal?.aborted).toBe(true);
  answer(ok(board()));

  await screen.findByRole('button', { name: 'Åpne Guild-fellesrom' });
  expect(screen.queryByRole('region', { name: 'Guild-oppslag' })).toBeNull();
});
