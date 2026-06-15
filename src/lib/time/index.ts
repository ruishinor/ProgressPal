export function formatTimestampInput(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function parseTimestampInput(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  const parts = trimmedValue.split(':');

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  if (!parts.every((part) => /^\d+$/.test(part))) {
    return null;
  }

  const numericParts = parts.map((part) => Number.parseInt(part, 10));

  if (numericParts.some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = numericParts;

    if (seconds === undefined || seconds >= 60) {
      return null;
    }

    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = numericParts;

  if (
    minutes === undefined ||
    seconds === undefined ||
    minutes >= 60 ||
    seconds >= 60
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

export function getWholeMinutesFromElapsedMilliseconds(
  elapsedMilliseconds: number,
) {
  const safeMilliseconds = Math.max(0, Math.floor(elapsedMilliseconds));

  return Math.floor(safeMilliseconds / 60_000);
}

export function formatDurationMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}
