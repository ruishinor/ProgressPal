export function ActivityIcon({
  activityId,
  complete = false,
}: {
  activityId?: string;
  complete?: boolean;
}) {
  // Missing artwork uses the adjacent movement name. The Activity heart is
  // reserved for the title/level, where no movement identity is supplied.
  const movement =
    activityId &&
    ['running', 'walking', 'pushups', 'squats', 'cycling'].includes(activityId)
      ? activityId
      : null;
  if (!complete && activityId !== undefined && !movement) return null;

  const icon = complete ? 'complete' : (movement ?? 'general');
  return (
    <span
      className="activity-icon"
      data-activity-icon={icon}
      aria-hidden="true"
    />
  );
}
