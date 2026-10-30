import { describe, expect, it } from 'vitest';

import { typerOgInputSession } from '@/programmes/programvareutvikling/microlearning/typerOgInput';
import { uxUuSessions } from '@/programmes/programvareutvikling/microlearning/utviklerblikk/uxUu';

describe('EDU-03 focused examples', () => {
  it('introduces type() before its first practice without changing the answer', () => {
    const lesson = typerOgInputSession.cards.find(
      (card) => card.id === 'typer-forskjell',
    );
    expect(lesson?.kind).toBe('learn');
    if (lesson?.kind !== 'learn') throw new Error('Missing type lesson');
    expect(lesson.idea).toContain('print(type(45))');
    expect(lesson.idea).toContain("<class 'int'>");
    expect(lesson.idea).toContain('sjekke om verdien er tekst');

    const practice = typerOgInputSession.cards.find(
      (card) => card.id === 'typer-type-av',
    );
    expect(practice?.kind).toBe('select');
    if (practice?.kind !== 'select') throw new Error('Missing type practice');
    expect(practice.code).toBe('print(type("7"))');
    expect(practice.correctId).toBe('str');
    expect(practice.options.map(({ id }) => id)).toEqual(['int', 'str', 'sju']);
  });

  it('explains image-only information without changing the accessibility task', () => {
    const session = uxUuSessions.find((entry) => entry.id === 'tsu-ux-uu-u03');
    const lesson = session?.cards.find(
      (card) => card.id === 'tsu-ux-uu-u03-flere',
    );
    expect(lesson?.kind).toBe('learn');
    if (lesson?.kind !== 'learn') throw new Error('Missing UX/UU lesson');
    expect(lesson.idea).toContain('Avgang 08.30');
    expect(lesson.idea).toContain('lesbar tekst');

    const practice = session?.cards.find(
      (card) => card.id === 'tsu-ux-uu-u03-ny',
    );
    expect(practice?.kind).toBe('select');
    if (practice?.kind !== 'select') throw new Error('Missing UX/UU practice');
    expect(practice.correctId).toBe('tekst');
    expect(practice.options.map(({ id }) => id)).toEqual([
      'lyd',
      'tekst',
      'bilde',
    ]);
  });
});
