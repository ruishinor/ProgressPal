import { RpgProgressBar } from '@/features/rpg/components/RpgProgressBar';
import type { RpgHubSummary } from '@/features/rpg/model/types';

export function RpgLevelProgress({ xp }: { xp: RpgHubSummary['xpSummary'] }) {
  return (
    <div
      className="rpg-level-progress"
      aria-label="Hero progression"
      role="group"
    >
      <div
        className="rpg-level-progress__marker"
        aria-label={`Level ${xp.level}`}
      >
        <svg aria-hidden="true" viewBox="0 0 64 76" focusable="false">
          <path d="M32 3 60 13v31c0 12-16 22-28 29C20 66 4 56 4 44V13Z" />
        </svg>
        <span>Level</span>
        <strong>{xp.level}</strong>
      </div>
      <div className="rpg-level-progress__xp">
        <p className="rpg-level-progress__total">{xp.totalXp} XP total</p>
        <RpgProgressBar
          label={`XP progress to level ${xp.level + 1}`}
          value={xp.levelProgressPercent}
          showValue={false}
          className="rpg-level-progress__bar"
        />
        <p className="rpg-level-progress__remaining">
          {xp.xpToNextLevel} XP to level {xp.level + 1}
        </p>
      </div>
    </div>
  );
}
