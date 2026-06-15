import rawCourseSeed from './cs50x-2026.json';

import { parseCourseSeed, type CourseSeed } from '@/lib/domain';

export const bundledCourseSeed: CourseSeed = parseCourseSeed(rawCourseSeed);
