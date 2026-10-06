import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyableRoles } from '@/features/lessons/copyPolicy';
import { LessonTextBlockView } from '@/features/lessons/LessonBlocks';
import type { MarkupContext } from '@/features/lessons/markup';
import type { LessonTextBlock } from '@/lib/domain';
import { programvareutviklingLessonCopy as copy } from '@/programmes/programvareutvikling/lessonCopy';

/**
 * Learner feedback 2026-10-06: Copy is an explicit property of what a
 * preformatted block is, not of the fact that it is preformatted; and the
 * callout kinds the content already carries are told apart by label and
 * glyph, with red kept for errors and green for a correct result.
 */

const context: MarkupContext = {
  technicalLanguage: 'en',
  wording: (text) => text,
  headingLevel: 3,
};

beforeEach(() => {
  // Without a clipboard the control is never offered, which would hide the
  // policy: give the page one, as any current browser has.
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

function renderBlock(block: LessonTextBlock) {
  return render(
    <LessonTextBlockView block={block} context={context} copy={copy} />,
  );
}

const copyButtons = () => screen.queryAllByRole('button', { name: 'Kopier' });

const session = [
  { prompt: 'PS C:\\kode> ', cmd: 'py hei.py', out: 'Hei, verden!' },
];

describe('copy policy by role', () => {
  it('offers Copy for editor source only', () => {
    expect(copyableRoles).toEqual({
      source: true,
      terminal: false,
      output: false,
      error: false,
    });
  });

  it('offers Copy for the code of a code block and not for its output or error', () => {
    renderBlock({
      t: 'code',
      file: 'hei.py',
      code: 'print("Hei")',
      stdout: 'Hei',
      error: 'NameError: name x is not defined',
      nb: '',
    } as LessonTextBlock);

    expect(copyButtons()).toHaveLength(1);
    const [button] = copyButtons();
    // The only Copy sits with the source, under the file label.
    expect(button!.closest('.lesson-pre')).toHaveClass('lesson-pre--source');
    expect(screen.getByText('Utskrift:').closest('.lesson-pre')).toHaveClass(
      'lesson-pre--output',
    );
    expect(
      screen.getByText('Feilmelding:').closest('.lesson-pre'),
    ).not.toContainElement(button!);
  });

  it('offers no Copy for a terminal session', () => {
    renderBlock({ t: 'terminal', session, nb: '' } as LessonTextBlock);

    expect(screen.getByText(/py hei\.py/)).toBeInTheDocument();
    expect(copyButtons()).toHaveLength(0);
  });

  it('offers no Copy for a documented, unreproduced transcript', () => {
    renderBlock({
      t: 'doc-terminal',
      text: 'python: command not found',
      source: 'dokumentasjonen',
      nb: '',
      unverified: true,
    } as LessonTextBlock);

    expect(copyButtons()).toHaveLength(0);
  });

  it('offers Copy for the source of an error block and none for its error text', () => {
    renderBlock({
      t: 'error',
      file: 'feil.py',
      code: 'print(x)',
      stdin: '',
      terminal: 'NameError: name x is not defined',
      err_type: 'NameError',
      err_line: 1,
      err_message: 'name x is not defined',
      err_last: 'NameError: name x is not defined',
      nb: '',
    } as unknown as LessonTextBlock);

    expect(copyButtons()).toHaveLength(1);
    expect(copyButtons()[0]!.closest('.lesson-pre')).toHaveClass(
      'lesson-pre--source',
    );
  });

  it('offers Copy only for the code of a worked step, never for its session, output or error', () => {
    renderBlock({
      t: 'worked',
      title: 'Eksempel',
      steps: [
        {
          say: 'Skriv',
          code: 'print("Hei")',
          stdout: 'Hei',
          error: 'Traceback',
          session,
        },
      ],
    } as unknown as LessonTextBlock);

    expect(copyButtons()).toHaveLength(1);
    expect(copyButtons()[0]!.closest('.lesson-pre')).toHaveClass(
      'lesson-pre--source',
    );
  });

  it('copies the text of the source it belongs to', async () => {
    renderBlock({
      t: 'code',
      file: 'hei.py',
      code: 'print("Hei")',
      nb: '',
    } as LessonTextBlock);
    fireEvent.click(copyButtons()[0]!);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('print("Hei")');
    expect(
      await screen.findByRole('button', { name: 'Kopiert' }),
    ).toBeInTheDocument();
  });
});

describe('callout kinds', () => {
  const kinds = ['tip', 'merk', 'pass-paa', 'veikart'] as const;

  it.each(kinds)(
    '%s keeps its label and glyph and carries its kind as a class',
    (kind) => {
      renderBlock({ t: 'callout', kind, nb: 'Tekst.' } as LessonTextBlock);

      const note = screen.getByRole('note');

      expect(note).toHaveClass('lesson-callout', `lesson-callout--${kind}`);
      expect(
        within(note).getByText(copy.calloutLabels[kind]!),
      ).toBeInTheDocument();
      // The glyph is decorative: the label alone names the kind.
      const glyph = note.querySelector('svg');
      expect(glyph).toHaveAttribute('aria-hidden', 'true');
      expect(glyph!.querySelector('path')!.getAttribute('d')).toBeTruthy();
    },
  );

  it('draws a different glyph for each kind, so no kind depends on colour alone', () => {
    const shapes = kinds.map((kind) => {
      const { container, unmount } = renderBlock({
        t: 'callout',
        kind,
        nb: 'Tekst.',
      } as LessonTextBlock);
      const d = container.querySelector('svg path')!.getAttribute('d');

      unmount();
      return d;
    });

    expect(new Set(shapes).size).toBe(kinds.length);
  });

  it('labels error output as an error, with its own class for the red bar', () => {
    renderBlock({
      t: 'error',
      file: 'feil.py',
      code: 'print(x)',
      terminal: 'NameError: x',
      nb: '',
    } as unknown as LessonTextBlock);

    expect(screen.getByText('Feilmelding:').closest('.lesson-pre')).toHaveClass(
      'lesson-pre--error',
    );
  });
});
