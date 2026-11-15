/** Where Send feedback goes. It is visible to anyone using the app. */
export const feedbackAddress = 'ruishinor@gmail.com';

/** A mailto link with only the app version prefilled: no learner data. */
export function feedbackMailto(version: string) {
  const subject = encodeURIComponent('ProgressPal feedback');
  const body = encodeURIComponent(
    `What happened, or what would you like to see?\n\n\n---\nApp version: ${version}`,
  );
  return `mailto:${feedbackAddress}?subject=${subject}&body=${body}`;
}
