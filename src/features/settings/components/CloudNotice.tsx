import type { ReactNode } from 'react';

import type { Notice } from '../cloudModel';

type CloudNoticeProps = {
  notice: Notice;
  children?: ReactNode;
};

/**
 * One factual result of a learner's cloud action. Failures and unknown
 * outcomes are announced assertively; a success or a neutral note politely.
 * Built only from existing classes (no stylesheet of its own).
 */
export function CloudNotice({ notice, children }: CloudNoticeProps) {
  const assertive = notice.tone === 'danger' || notice.tone === 'warning';

  return (
    <div className="backup-verify" role={assertive ? 'alert' : 'status'}>
      <p
        className={
          notice.tone === 'danger'
            ? 'data-action__error'
            : 'backup-verify__title'
        }
      >
        {notice.title}
      </p>
      {notice.lines.map((line) => (
        <p className="card__description" key={line}>
          {line}
        </p>
      ))}
      {children}
    </div>
  );
}
