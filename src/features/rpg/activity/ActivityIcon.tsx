export function ActivityIcon({
  activityId,
  complete = false,
}: {
  activityId?: string;
  complete?: boolean;
}) {
  const icon = complete
    ? 'complete'
    : activityId &&
        ['running', 'walking', 'pushups', 'squats', 'cycling'].includes(
          activityId,
        )
      ? activityId
      : 'general';
  return (
    <span
      className="activity-icon"
      data-activity-icon={icon}
      aria-hidden="true"
    />
  );
}
