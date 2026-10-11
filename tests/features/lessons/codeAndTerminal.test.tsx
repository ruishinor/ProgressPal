import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonTextBlockView } from '@/features/lessons/LessonBlocks';
import type { MarkupContext } from '@/features/lessons/markup';
import type { LessonTextBlock } from '@/lib/domain';
import { programvareutviklingLessonCopy as copy } from '@/programmes/programvareutvikling/lessonCopy';

import { p2Modules } from '../../programmes/p2Content';

/**
 * Follow-up 2026-10-11: Python source and a real PowerShell transcript are
 * told apart by their headings, and the one real leading space of the
 * indentation example is made visible by a note beside the code, never inside
 * the source, the copy text or the transcript. Read from the authored block.
 */

const context: MarkupContext = {
  technicalLanguage: 'en',
  wording: (text) => text,
  headingLevel: 3,
};

const indentation = (
  p2Modules['S1-M01'] as unknown as {
    units: Array<{ flow: Array<Record<string, unknown>> }>;
  }
).units
  .flatMap((unit) => unit.flow)
  .find((block) => block.t === 'error' && block.code === ' print("Hei")')!;

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

function renderIndentation() {
  return render(
    <LessonTextBlockView
      block={indentation as unknown as LessonTextBlock}
      context={context}
      copy={copy}
    />,
  );
}

describe('source and transcript are told apart', () => {
  it('names the Python source file and the PowerShell terminal as separate groups', () => {
    renderIndentation();

    const source = screen.getByRole('group', { name: 'Python-fil: hei.py' });
    const terminal = screen.getByRole('group', {
      name: 'Terminal – PowerShell',
    });

    expect(source).toHaveClass('lesson-pre--source');
    expect(terminal).not.toContainElement(source);
    expect(within(terminal).getByText(/IndentationError/)).toBeInTheDocument();
  });

  it('keeps every source and transcript byte, and offers Copy for the source only', () => {
    const { container } = renderIndentation();
    const pres = [...container.querySelectorAll('pre')].map(
      (pre) => pre.textContent,
    );

    expect(pres).toEqual([indentation.code, indentation.terminal]);
    const buttons = screen.getAllByRole('button', { name: 'Kopier' });

    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]!);
    expect(writeText).toHaveBeenCalledWith(' print("Hei")');
  });

  it('shows the one leading space with a labelled marker that is not part of the source', () => {
    const { container } = renderIndentation();
    const source = screen.getByRole('group', { name: 'Python-fil: hei.py' });

    expect(within(source).getByText(/ett mellomrom/i)).toBeInTheDocument();
    expect(within(source).getByText('·print("Hei")')).toBeInTheDocument();
    expect(container.querySelector('pre')!.textContent).toBe(' print("Hei")');
    expect(writeText).not.toHaveBeenCalled();
  });
});
