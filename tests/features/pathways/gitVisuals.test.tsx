import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';

import { GitLessonVisual } from '@/features/lessons/GitLessonVisual';
import { gitVisuals } from '@/features/lessons/gitVisuals';

it('switches the commit graph using native controls', () => {
  const visual = gitVisuals.find(
    (entry) => entry.lesson === 'git-m03-o01' && entry.kind === 'graph',
  )!;
  render(<GitLessonVisual visual={visual} />);
  const merge = screen.getByRole('button', { name: 'Merge commit' });
  fireEvent.click(merge);
  expect(merge).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img')).toHaveAccessibleName(/main etter/);
});

it('compares the two status columns and their file versions', () => {
  const visual = gitVisuals.find(
    (entry) => entry.lesson === 'git-m01-o04' && entry.frames.length === 2,
  )!;
  render(<GitLessonVisual visual={visual} />);
  expect(screen.getByText('Staged', { exact: true })).toBeVisible();
  expect(screen.getByText('Unstaged', { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Filversjoner' }));
  expect(screen.getByText('Staging area', { exact: true })).toBeVisible();
  expect(screen.getByText(/Ta med kart/)).toBeVisible();
});

it('shows why a length check alone is insufficient', () => {
  const visual = gitVisuals.find((entry) => entry.kind === 'test')!;
  render(<GitLessonVisual visual={visual} />);
  const results = screen.getByText('Bare lengde').parentElement!;
  const digits = screen.getByText('Lengde og siffer').parentElement!;
  expect(within(results).getByText('Godtas')).toBeVisible();
  expect(within(digits).getByText('Avvises')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '12345678' }));
  expect(within(digits).getByText('Godtas')).toBeVisible();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '1234567 ' },
  });
  expect(within(results).getByText('Godtas')).toBeVisible();
  expect(within(digits).getByText('Avvises')).toBeVisible();
});

it('keeps the staged snapshot unchanged after another edit and commit', () => {
  const visual = gitVisuals.find(
    (entry) => entry.lesson === 'git-m01-o03' && entry.frames.length === 4,
  )!;
  render(<GitLessonVisual visual={visual} />);
  fireEvent.click(screen.getByRole('button', { name: 'Rediger igjen' }));
  const staged = screen.getByText('Staging area').parentElement!;
  const working = screen.getByText('Working tree').parentElement!;
  expect(staged).not.toHaveTextContent('Ta med lader.');
  expect(working).toHaveTextContent('Ta med lader.');
  expect(screen.getByText('MM notat.txt', { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'git commit' }));
  const committed = screen.getByText('Siste commit').parentElement!;
  expect(committed).toHaveTextContent('Møtested: biblioteket');
  expect(committed).not.toHaveTextContent('Ta med lader.');
});

it('compares reset effects without altering a real repository', () => {
  const visual = gitVisuals.find((entry) => entry.kind === 'effects')!;
  render(<GitLessonVisual visual={visual} />);
  fireEvent.click(screen.getByRole('button', { name: 'Soft' }));
  expect(screen.getByText('Staging area').parentElement).toHaveTextContent(
    'Ny tekst',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Mixed' }));
  expect(screen.getByText('Staging area').parentElement).toHaveTextContent(
    'Gammel tekst',
  );
  expect(screen.getByText('Working tree').parentElement).toHaveTextContent(
    'Ny tekst',
  );
});

it('keeps remote, tracking and working history distinct during fetch and push', () => {
  const visual = gitVisuals.find(
    (entry) => entry.lesson === 'git-m04-o05' && entry.kind === 'remote',
  )!;
  const { container } = render(<GitLessonVisual visual={visual} />);
  const chainLengths = () =>
    Array.from(
      container.querySelectorAll('.git-remote-chain'),
      (chain) => chain.querySelectorAll('.git-remote-commit').length,
    );

  expect(chainLengths()).toEqual([2, 1, 1]);
  fireEvent.click(screen.getByRole('button', { name: /^Fetch$/ }));
  expect(chainLengths()).toEqual([2, 2, 1]);
  fireEvent.click(screen.getByRole('button', { name: 'Pull' }));
  expect(chainLengths()).toEqual([2, 2, 2]);
  fireEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(chainLengths()).toEqual([3, 3, 3]);
});

it('keeps the simulated pull request blocked until checks and review pass', () => {
  const visual = gitVisuals.find(
    (entry) => entry.lesson === 'git-m05-o03' && entry.kind === 'pr',
  )!;
  render(<GitLessonVisual visual={visual} />);
  const checks = screen.getByRole('list', { name: 'Status checks' });
  fireEvent.click(screen.getByRole('button', { name: 'Test feiler' }));
  expect(within(checks).getByText(/mellomrom.*Feilet/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Sjekker består' }));
  expect(within(checks).getAllByText(/Bestått/)).toHaveLength(2);
  expect(screen.getByText('Venter på godkjent review')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Klar for merge' }));
  expect(
    screen.getByText('Klar for merge', { selector: 'strong' }),
  ).toBeVisible();
});
