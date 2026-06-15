export const courseMapPath = '/course' as const;
export const courseDetailPathPattern = '/course/:itemId' as const;
export const studySessionsPath = '/sessions' as const;

export function getCourseItemDetailPath(itemId: string) {
  return courseDetailPathPattern.replace(':itemId', itemId);
}

export function getStudySessionsPath(itemId?: string) {
  if (itemId === undefined || itemId.trim().length === 0) {
    return studySessionsPath;
  }

  return `${studySessionsPath}?itemId=${encodeURIComponent(itemId)}`;
}
