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
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '1234567 ' } });
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
