import { loadSameOriginText } from '@/lib/assets';

import type { GitVisual } from './gitVisuals';

export const campaignM01VisualPath =
  'content/presentation/campaign-m01.b5c4af7705724083.json';
export const campaignM01VisualSha =
  'b5c4af77057240836853314601d6e523c292e0a334944df4bda9005c2ece3367';

// A packaged, offline-cached presentation asset, not an authoring export.
// On a missing or mismatched asset, show the complete original lesson.
export async function loadCampaignM01Visuals(): Promise<readonly GitVisual[]> {
  try {
    const text = await loadSameOriginText(campaignM01VisualPath);
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text),
    );
    const hex = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return hex === campaignM01VisualSha
      ? (JSON.parse(text) as GitVisual[])
      : [];
  } catch {
    return [];
  }
}

export function campaignM01VisualFor(
  visuals: readonly GitVisual[],
  unitId: string,
  text: string,
) {
  return visuals.find(
    (visual) => visual.lesson === unitId && text.startsWith(visual.anchor),
  );
}
