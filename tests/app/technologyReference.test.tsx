import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { router } from '@/app/router/router';
import {
  defaultLearnerProfileValues,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

async function snapshot() {
  const result: Record<string, unknown[]> = {};
  for (const table of getSharedDatabase().tables)
    result[table.name] = await table.toArray();
  return JSON.stringify(result);
}

it('Home → search → entry → relation → search preserves URL state without learner writes', async () => {
  await onboard();
  const before = await snapshot();
  await renderAppAtRoute('/rpg');
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('link', { name: 'Teknologioppslag' }),
  );
  const nav = screen.getByRole('navigation', {
    name: 'RPG primary navigation',
  });
  expect(
    within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['Home', 'Campaign', 'Focus', 'Awards', 'Insights']);
  await user.type(screen.getByRole('searchbox'), 'K8s');
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Tema' }),
    'Drift',
  );
  await user.click(screen.getByRole('button', { name: 'Søk' }));
  await user.click(await screen.findByRole('link', { name: 'Kubernetes' }));
  await user.click(await screen.findByRole('link', { name: 'API' }));
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'API',
  );
  await user.click(
    screen.getByRole('link', { name: 'Tilbake til søk og tema' }),
  );
  expect(await screen.findByRole('searchbox')).toHaveValue('K8s');
  expect(screen.getByRole('combobox', { name: 'Tema' })).toHaveValue('Drift');
  await act(async () => {
    await router.navigate(-1);
  });
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'API',
  );
  await act(async () => {
    await router.navigate(1);
  });
  expect(await screen.findByRole('searchbox')).toHaveValue('K8s');
  expect(await snapshot()).toBe(before);
});

it('direct unknown IDs show a recoverable reading state', async () => {
  await onboard();
  await renderAppAtRoute('/rpg/oppslag/unknown?q=React');
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Oppføringen finnes ikke',
  );
  expect(
    screen.getByRole('link', { name: 'Tilbake til søk og tema' }),
  ).toHaveAttribute('href', '/rpg/oppslag?q=React');
});

it('offers filter recovery and separates related concepts from a beginner question answer', async () => {
  await onboard();
  await renderAppAtRoute('/rpg/oppslag?q=API%3F&tema=Drift');
  const user = userEvent.setup();
  expect(await screen.findByRole('searchbox')).toHaveValue('API?');
  expect(
    within(screen.getByRole('list', { name: 'Direkte treff' })).queryAllByRole(
      'link',
    ),
  ).toEqual([]);
  expect(
    screen.queryByRole('link', { name: 'Kubernetes' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Søk i alle temaer' }));
  expect(await screen.findByRole('combobox', { name: 'Tema' })).toHaveValue('');
  expect(screen.getByRole('searchbox')).toHaveValue('API?');
  expect(
    within(screen.getByRole('list', { name: 'Direkte treff' }))
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['API']);
  expect(
    within(
      screen.getByRole('region', { name: 'Relaterte begreper og omtaler' }),
    ).getByRole('link', { name: 'Kubernetes' }),
  ).toBeInTheDocument();
  await user.clear(screen.getByRole('searchbox'));
  await user.type(screen.getByRole('searchbox'), 'Hva er React?');
  await user.click(screen.getByRole('button', { name: 'Søk' }));
  expect(
    within(await screen.findByRole('list', { name: 'Direkte treff' }))
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['React']);
});

it('does not turn an unknown language into JavaScript, and labels prose-only results', async () => {
  await onboard();
  await renderAppAtRoute('/rpg/oppslag?q=Java');
  expect(await screen.findByRole('searchbox')).toHaveValue('Java');
  expect(
    screen.queryByRole('link', { name: 'JavaScript' }),
  ).not.toBeInTheDocument();
  await act(async () => {
    await router.navigate('/rpg/oppslag?q=registrerer+historikk');
  });
  expect(
    within(screen.getByRole('list', { name: 'Direkte treff' })).queryAllByRole(
      'link',
    ),
  ).toEqual([]);
  expect(
    within(
      screen.getByRole('region', { name: 'Relaterte begreper og omtaler' }),
    ).getByRole('link', { name: 'Git' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Versjonskontrollverktøy · Omtale i forklaringen'),
  ).toBeInTheDocument();
});
