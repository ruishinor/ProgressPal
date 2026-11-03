/** Stable Pathways identity and routes; independent of the active programme. */
export const gitPathwayProgrammeId = 'git-github';
export const pathwaysPath = '/pathways';
export const rpgPathwaysPath = '/rpg/pathways';
export function getGitPathwayPath(rpg = false) {
  return `${rpg ? rpgPathwaysPath : pathwaysPath}/git-github`;
}
export function getPathwayLessonPath(itemId: string, rpg = false) {
  return `${getGitPathwayPath(rpg)}/${encodeURIComponent(itemId)}`;
}
