import { describe, expect, it } from 'vitest';

import type { MicroSelectCard } from '@/lib/domain';
import { teknologiSessions as sessions } from '@/programmes/programvareutvikling/microlearning/utviklerblikk/teknologier';
import { tenkSomEnUtviklerTrack as track } from '@/programmes/programvareutvikling/microlearning/tenkSomEnUtvikler';

const decisions = sessions
  .flatMap((s) => s.cards)
  .filter((c): c is MicroSelectCard => c.kind === 'select');

describe('EDU-04 authored reasoning and integration', () => {
  it('appends five independent, ungated activities using the existing contract', () => {
    expect(track.categories!.at(-1)).toEqual({
      id: 'teknologier-og-rammeverk',
      title: 'Teknologier og rammeverk',
      summary: 'Forstå delene og velg etter behov.',
      sessionIds: sessions.map((s) => s.id),
    });
    expect(track.sessions.slice(36)).toEqual(sessions);
    for (const [i, s] of sessions.entries()) {
      expect(s.id).toBe(`tsu-tek-0${i + 1}`);
      expect(s.minutes).toBeGreaterThanOrEqual(2);
      expect(s.minutes).toBeLessThanOrEqual(5);
      expect(s.cards.map((c) => c.role)).toEqual([
        'explain',
        'explain',
        'scaffold',
        'application',
      ]);
      expect(s.cards.at(-1)!.title).toMatch(/^Ny situasjon:/);
      expect(s.takeaway).toBeTruthy();
      for (const c of s.cards) {
        expect(c.source).toEqual({
          moduleId: track.id,
          lessonUnitIds: [`TEK-0${i + 1}`],
          skillIds: ['SK-METH-01'],
        });
      }
    }
  });

  it('retains deliberate answer keys for diagnosis and transfer, with diagnostic distractors', () => {
    // These keys express the authored decisions, independently of array position.
    expect(decisions.map((c) => [c.id, c.correctId])).toEqual([
      ['tsu-tek-01-valg', 'ui'],
      ['tsu-tek-01-overfor', 'enkelt'],
      ['tsu-tek-02-valg', 'publiser'],
      ['tsu-tek-02-overfor', 'filer'],
      ['tsu-tek-03-valg', 'backend'],
      ['tsu-tek-03-overfor', 'lokalt'],
      ['tsu-tek-04-valg', 'vue'],
      ['tsu-tek-04-overfor', 'behov'],
      ['tsu-tek-05-valg', 'next'],
      ['tsu-tek-05-overfor', 'behold'],
    ]);
    for (const c of decisions) {
      expect(c.context, c.id).toBeTruthy();
      expect(c.question, c.id).toBeTruthy();
      expect(c.hint, c.id).not.toBe(c.explanation);
      expect(c.options.filter((o) => o.id === c.correctId)).toHaveLength(1);
      const feedback = c.options
        .filter((o) => o.id !== c.correctId)
        .map((o) => o.feedback);
      expect(feedback.every(Boolean), c.id).toBe(true);
      expect(new Set(feedback).size, c.id).toBe(feedback.length);
    }
  });

  it('states the premises that make the contextual choices defensible', () => {
    const context = (id: string) => decisions.find((c) => c.id === id)!.context;
    expect(context('tsu-tek-01-overfor')).toMatch(
      /Ingen innlogging eller deling/,
    );
    expect(context('tsu-tek-03-valg')).toMatch(/direkte til API/);
    expect(context('tsu-tek-03-overfor')).toMatch(
      /nettleserlagring kan slettes/,
    );
    expect(context('tsu-tek-04-valg')).toMatch(/kjenner Vue/);
    expect(context('tsu-tek-04-valg')).toMatch(/beholde resten/);
    expect(context('tsu-tek-04-overfor')).toMatch(/støttes fortsatt/);
    expect(context('tsu-tek-05-valg')).toMatch(/samle ruting og serverkode/);
    expect(context('tsu-tek-05-overfor')).toMatch(/ingen nye serverfunksjoner/);
  });
});
