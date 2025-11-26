/**
 * Review frequency options for treatment plans
 */
export const REVIEW_FREQUENCY_OPTIONS = {
  '90_DAY': { label: '90 Days', days: 90 },
  '30_DAY': { label: '30 Days', days: 30 },
  '2_WEEK': { label: '2 Weeks', days: 14 },
  '1_WEEK': { label: '1 Week', days: 7 },
  '1_DAY': { label: '1 Day', days: 1 },
  'EVERY_SESSION': { label: 'Every Session', days: 0 },
} as const;

export type ReviewFrequency = keyof typeof REVIEW_FREQUENCY_OPTIONS;
