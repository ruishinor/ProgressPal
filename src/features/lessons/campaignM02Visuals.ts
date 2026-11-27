import { loadSameOriginText } from '@/lib/assets';

import type { GitVisual } from './gitVisuals';

export const campaignM02VisualPath =
  'content/presentation/campaign-m02.8e9298308551215f.json';
export const campaignM02VisualSha =
  '8e9298308551215fa441f80db24858ff72d70e71aee9df66d9ff7f8d42323057';

// Packaged teaching data is loaded only for M02 and cached for offline use.
// On failure, the unchanged lesson remains usable.
export async function loadCampaignM02Visuals(): Promise<readonly GitVisual[]> {
  try {
    const text = await loadSameOriginText(campaignM02VisualPath);
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text),
    );
    const hex = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return hex === campaignM02VisualSha
      ? (JSON.parse(text) as GitVisual[])
      : [];
  } catch {
    return [];
  }
}

export function campaignM02VisualFor(
  visuals: readonly GitVisual[],
  unitId: string,
  text: string,
) {
  return visuals.find(
    (visual) => visual.lesson === unitId && visual.anchor === text,
  );
}
