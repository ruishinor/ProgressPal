import type {
  ExternalResourceLink,
  ProgrammeExternalResources,
} from '../definition';

/**
 * Official CS50x page links for the `cs50x-2026` definition (moved in Epic C /
 * C2 from `features/course/cs50Links.ts`; values unchanged). These are static
 * anchors the learner navigates to; the app never fetches them.
 */

const CS50X_BASE = 'https://cs50.harvard.edu/x';

const unitLinks: Record<string, ExternalResourceLink> = {
  'week-0': {
    label: 'Week 0 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/0/`,
  },
  'week-1': {
    label: 'Week 1 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/1/`,
  },
  'week-2': {
    label: 'Week 2 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/2/`,
  },
  'week-3': {
    label: 'Week 3 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/3/`,
  },
  'week-4': {
    label: 'Week 4 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/4/`,
  },
  'week-5': {
    label: 'Week 5 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/5/`,
  },
  'week-6': {
    label: 'Week 6 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/6/`,
  },
  'week-7': {
    label: 'Week 7 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/7/`,
  },
  'week-8': {
    label: 'Week 8 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/8/`,
  },
  'week-9': {
    label: 'Week 9 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/9/`,
  },
  'week-10': {
    label: 'Week 10 on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/10/`,
  },
  'artificial-intelligence': {
    label: 'AI Week on CS50.harvard.edu',
    url: `${CS50X_BASE}/weeks/ai/`,
  },
  'additional-practice': {
    label: 'Practice Problems on CS50.harvard.edu',
    url: `${CS50X_BASE}/practice/`,
  },
  'final-project': {
    label: 'Final Project on CS50.harvard.edu',
    url: `${CS50X_BASE}/project/`,
  },
};

const itemLinks: Record<string, ExternalResourceLink> = {
  'week-0-problem-set': {
    label: 'Problem Set 0 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/0/`,
  },
  'week-1-problem-set': {
    label: 'Problem Set 1 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/1/`,
  },
  'week-2-problem-set': {
    label: 'Problem Set 2 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/2/`,
  },
  'week-3-problem-set': {
    label: 'Problem Set 3 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/3/`,
  },
  'week-4-problem-set': {
    label: 'Problem Set 4 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/4/`,
  },
  'week-5-problem-set': {
    label: 'Problem Set 5 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/5/`,
  },
  'week-6-problem-set': {
    label: 'Problem Set 6 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/6/`,
  },
  'week-7-problem-set': {
    label: 'Problem Set 7 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/7/`,
  },
  'week-8-problem-set': {
    label: 'Problem Set 8 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/8/`,
  },
  'week-9-problem-set': {
    label: 'Problem Set 9 on CS50.harvard.edu',
    url: `${CS50X_BASE}/psets/9/`,
  },
  'final-project-build': {
    label: 'Final Project on CS50.harvard.edu',
    url: `${CS50X_BASE}/project/`,
  },
  'final-project-video-demo': {
    label: 'Final Project on CS50.harvard.edu',
    url: `${CS50X_BASE}/project/`,
  },
  'final-project-readme': {
    label: 'Final Project on CS50.harvard.edu',
    url: `${CS50X_BASE}/project/`,
  },
  'final-project-submit50': {
    label: 'Final Project on CS50.harvard.edu',
    url: `${CS50X_BASE}/project/`,
  },
  'final-project-gradebook-check': {
    label: 'Final Project on CS50.harvard.edu',
    url: `${CS50X_BASE}/project/`,
  },
};

export const cs50ExternalResources: ProgrammeExternalResources = {
  allowedUrlPrefixes: [`${CS50X_BASE}/`],
  unitLinks,
  itemLinks,
};
