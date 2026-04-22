export const STEPS_BY_VARIANT = {
  default: [
    'Find your business',
    'App Branding',
    'Get your app',
  ],
  feedback: [
    'Find your business',
    'Your guest report',
    'Your solution',
    'Get the app',
  ],
} as const;

export type ProgressBarVariant = keyof typeof STEPS_BY_VARIANT;
