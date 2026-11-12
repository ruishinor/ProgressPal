import { useSyncExternalStore } from 'react';

export const rpgStyleOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'vibrant', label: 'Vibrant Accent' },
  { value: 'glass', label: 'Glassmorphic Contrast' },
  { value: 'playful', label: 'High-Contrast Playful' },
] as const;

type RpgStyle = (typeof rpgStyleOptions)[number]['value'];
const storageKey = 'progresspal:rpg-style';
const listeners = new Set<() => void>();
let temporaryStyle: RpgStyle | undefined;

function isRpgStyle(value: string | null): value is RpgStyle {
  return rpgStyleOptions.some((option) => option.value === value);
}

function readStyle(): RpgStyle {
  if (temporaryStyle !== undefined) return temporaryStyle;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isRpgStyle(stored) ? stored : 'standard';
  } catch {
    return 'standard';
  }
}

function subscribe(listener: () => void) {
  function sync(event: StorageEvent) {
    if (event.key !== null && event.key !== storageKey) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    temporaryStyle = undefined;
    listener();
  }

  listeners.add(listener);
  window.addEventListener('storage', sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', sync);
  };
}

export function useRpgStyle() {
  return useSyncExternalStore(subscribe, readStyle);
}

export function useRpgStyleIsTemporary() {
  return useSyncExternalStore(subscribe, () => temporaryStyle !== undefined);
}

export function saveRpgStyle(value: string) {
  if (!isRpgStyle(value)) return;

  try {
    window.localStorage.setItem(storageKey, value);
    temporaryStyle = undefined;
  } catch {
    temporaryStyle = value;
  }
  listeners.forEach((listener) => listener());
}
