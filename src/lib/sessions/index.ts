// The sessions UI and RPG Focus share the result of the same DB write.
// Keep its shape owned by the write boundary without importing DB from RPG UI.
export type { AddStudySessionWithXpResult as StudySessionSaveResult } from '@/lib/db';
