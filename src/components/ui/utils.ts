export type StatusTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

export function classNames(
  ...values: Array<string | false | null | undefined>
) {
  return values.filter(Boolean).join(' ');
}

export function clampNumber(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(Math.max(value, minimum), maximum);
}
