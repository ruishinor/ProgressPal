import { RpgButton, RpgPanel, RpgStatusPill } from '@/features/rpg/components';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

const trustItems = [
  'ProgressPal stores your records in this browser on this device.',
  'There is no ProgressPal account, no cloud sync, and no hidden analytics.',
  'Browser storage can be cleared by you, your browser, your device, or system cleanup tools.',
  'Exporting a backup before clearing data or changing devices is the recovery path.',
];

const rpgBoundaryItems = [
  'RPG routes read the same local ProgressPal data as the classic screens.',
  'RPG rank, badges, profile, and activity summaries are local ProgressPal interpretations.',
  'RPG status does not change official CS50, Harvard, edX, or OpenCourseWare progress.',
  'Official CS50 links, when shown elsewhere in the app, are user-clicked external links only.',
];

const faqItems = [
  {
    answer:
      'Use classic Settings to export a local JSON backup. Keep that file somewhere private and durable. ProgressPal cannot recover data after browser storage is deleted unless you have an exported backup.',
    question: 'How do I back up RPG progress?',
  },
  {
    answer:
      'Use classic Settings to import a ProgressPal backup. Import replaces local data on this device with the backup contents, so review the preview before confirming.',
    question: 'How do I restore a backup?',
  },
  {
    answer:
      'Use classic Settings. Reset is intentionally plain and destructive: it removes local ProgressPal progress, sessions, XP, achievements, notes, media history, profile data, and backup history from this device.',
    question: 'Where is reset local data?',
  },
  {
    answer:
      'No. RPG is an alternate interface over the same local ProgressPal records. It does not create an account, sync data, track official course status, or add hidden telemetry.',
    question: 'Does RPG change what ProgressPal stores?',
  },
];

export function RpgSettingsPage() {
  return (
    <section className="page-section rpg-settings">
      <div className="rpg-settings__header">
        <div>
          <p className="rpg-settings__eyebrow">RPG</p>
          <h1>RPG Settings</h1>
          <p className="rpg-settings__lede">
            Read-only trust notes for local data, backup responsibility, reset
            boundaries, and the RPG layer.
          </p>
        </div>
        <div className="rpg-settings__actions">
          <RpgButton href={rpgRoutePath} variant="secondary">
            Back to Hub
          </RpgButton>
          <RpgButton href="/settings" variant="primary">
            Open classic Settings
          </RpgButton>
        </div>
      </div>

      <div className="rpg-settings__grid">
        <RpgPanel
          className="rpg-settings__panel"
          description="The RPG route does not add account, cloud, or analytics behavior."
          title="Local data"
          titleAs="h2"
        >
          <ul className="rpg-settings__list">
            {trustItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </RpgPanel>

        <RpgPanel
          className="rpg-settings__panel"
          description="The existing classic Settings route remains the data-control surface."
          title="Backup and restore"
          titleAs="h2"
        >
          <p className="rpg-settings__copy">
            Export, import, and reset controls live in classic Settings so RPG
            does not duplicate write behavior. Export a backup before clearing
            browser data or moving to another device.
          </p>
          <div className="rpg-settings__control-row">
            <RpgStatusPill tone="warning">
              Backup is your responsibility
            </RpgStatusPill>
            <RpgButton href="/settings" size="sm" variant="secondary">
              Open backup controls
            </RpgButton>
          </div>
        </RpgPanel>

        <RpgPanel
          className="rpg-settings__panel"
          description="Reset is available only in classic Settings and remains deliberately destructive."
          title="Reset local data"
          titleAs="h2"
        >
          <p className="rpg-settings__copy">
            Reset local data deletes this device&apos;s local ProgressPal data.
            It is not a game action, it is not reversible inside ProgressPal,
            and it does not affect official CS50 or Harvard systems.
          </p>
        </RpgPanel>

        <RpgPanel
          className="rpg-settings__panel"
          description="RPG changes presentation, not the underlying local study records."
          title="What RPG changes"
          titleAs="h2"
        >
          <ul className="rpg-settings__list">
            {rpgBoundaryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </RpgPanel>
      </div>

      <RpgPanel
        className="rpg-settings__faq"
        description="Plain answers for the settings and trust boundary."
        title="FAQ"
        titleAs="h2"
      >
        <dl className="rpg-settings__faq-list">
          {faqItems.map((item) => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </RpgPanel>

      <RpgPanel
        className="rpg-settings__official-boundary"
        description="ProgressPal can point you to official resources, but it is not official course infrastructure."
        title="Official course boundary"
        titleAs="h2"
        variant="raised"
      >
        <p className="rpg-settings__copy">
          ProgressPal RPG is a local study interface. RPG ranks, badges, and
          profile summaries are not CS50, Harvard, edX, or OpenCourseWare
          status. Use official course systems for official enrollment,
          submission, grading, certificates, and completion records.
        </p>
      </RpgPanel>
    </section>
  );
}
