import { expect, it } from 'vitest';

import {
  campaignM02Copy,
  campaignM02Revisions,
} from '@/features/lessons/campaignM02Copy';

import { p2Modules } from '../../programmes/p2Content';

it('applies scoped presentation edits without mutating the packaged blocks', () => {
  const module = p2Modules['S1-M02']!;
  const found = new Set<string>();
  for (const unit of module.units) {
    for (const [index, block] of unit.flow.entries()) {
      const key =
        block.t === 'exercise' ? block.id : `${unit.unit_id}:${index}`;
      const original = JSON.stringify(block);
      const copy = campaignM02Copy(key, block);
      if (Object.hasOwn(campaignM02Revisions, key)) {
        found.add(key);
        expect(copy).not.toBe(block);
        for (const revision of campaignM02Revisions[key]!) {
          const read = (value: unknown) =>
            revision.path.reduce<unknown>(
              (parent, part) =>
                (parent as Record<string | number, unknown>)[part],
              value,
            );
          expect(read(block)).toBe(revision.before);
          expect(read(copy)).toBe(revision.after);
        }
        if (block.t === 'exercise' && copy.t === 'exercise') {
          expect(copy.id).toBe(block.id);
          expect(copy.evaluator).toEqual(block.evaluator);
          expect(copy.hints).toHaveLength(block.hints.length);
        }
      } else {
        expect(copy).toBe(block);
      }
      expect(JSON.stringify(block)).toBe(original);
    }
  }
  expect(found.size).toBe(Object.keys(campaignM02Revisions).length);
});
