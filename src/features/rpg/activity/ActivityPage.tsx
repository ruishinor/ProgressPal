import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';
import {
  activityParticipation,
  activityDate,
  activityTotals,
  displayActivityAmount,
  goalProgress,
  recentActivityDays,
  toActivityAmount,
} from '@/lib/activity/model';
import {
  deleteActivityEntry,
  readActivityData,
  saveActivityDefinition,
  saveActivityEntry,
  saveActivitySettings,
} from '@/lib/db/activity';
import {
  builtinActivities,
  defaultActivitySettings,
  type ActivityDefinition,
  type ActivityEntry,
  type ActivityGoal,
  type ActivityUnit,
} from '@/lib/domain/activity';
import { RpgButton, RpgPanel, RpgProgressBar } from '@/features/rpg/components';

import { ActivityIcon } from './ActivityIcon';
import { useActivityLanguage, useActivityRead } from './useActivity';

const names: Record<string, string> = {
  pushups: 'Armhevinger',
  squats: 'Knebøy',
  kickbacks: 'Kickbacks',
  walking: 'Gåtur',
  running: 'Løping',
  cycling: 'Sykling',
};
const newGoalId = () => `goal-${crypto.randomUUID()}`;
type EntryDraft = {
  id?: string;
  activityId: string;
  unit: ActivityUnit;
  amount: string;
  date: string;
};
type ActivitySection = 'today' | 'history' | 'settings';
const sections: ActivitySection[] = ['today', 'history', 'settings'];

export function ActivityPage() {
  const nb = useActivityLanguage();
  const t = (no: string, en: string) => (nb ? no : en);
  const { data, error, today, retry } = useActivityRead(readActivityData);
  const { coordination, runLocalMutation } = useAppState();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [draft, setDraft] = useState<EntryDraft>({
    activityId: 'pushups',
    unit: 'reps',
    amount: '',
    date: '',
  });
  const [quickDraft, setQuickDraft] = useState<{
    goal: ActivityGoal;
    amount: string;
  } | null>(null);
  const [goal, setGoal] = useState<{
    id?: string;
    activityId: string;
    unit: ActivityUnit;
    target: string;
  }>({ activityId: 'pushups', unit: 'reps', target: '' });
  const [custom, setCustom] = useState<{
    id?: string;
    name: string;
    unit: ActivityUnit;
  }>({ name: '', unit: 'reps' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [section, setSection] = useState<ActivitySection>('today');
  const [focusRequest, setFocusRequest] = useState<
    | { target: 'amount' | 'goals' | 'quick' }
    | { target: 'quickLog'; goalId: string }
    | null
  >(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const quickInput = useRef<HTMLInputElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const logHeading = useRef<HTMLHeadingElement>(null);
  const goalHeading = useRef<HTMLHeadingElement>(null);
  const customHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!focusRequest) return;
    const target =
      focusRequest.target === 'quickLog'
        ? (document.getElementById(`activity-log-${focusRequest.goalId}`) ??
          logHeading.current)
        : focusRequest.target === 'quick'
          ? quickInput.current
          : focusRequest.target === 'amount'
            ? amountInput.current
            : goalHeading.current;
    if (target?.closest('[hidden]')) return;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center' });
  }, [focusRequest]);
  const locale = nb ? 'nb-NO' : 'en-GB';
  const showDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(locale);
  const daysLabel = (count: number) =>
    t(
      `${count} ${count === 1 ? 'dag' : 'dager'}`,
      `${count} ${count === 1 ? 'day' : 'days'}`,
    );
  function selectSection(next: ActivitySection) {
    setSection(next);
    setNotice((current) => (current?.error ? current : null));
  }
  const unitName = (unit: ActivityUnit) =>
    unit === 'reps'
      ? t('repetisjoner', 'repetitions')
      : unit === 'seconds'
        ? t('minutter', 'minutes')
        : 'km';
  const showAmount = (amount: number, unit: ActivityUnit) =>
    `${displayActivityAmount(amount, unit).toLocaleString(locale, { maximumFractionDigits: 3 })} ${unitName(unit)}`;

  async function mutate(
    action: () => Promise<unknown>,
    success: string,
    after?: () => void,
  ) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setNotice(null);
    try {
      await runLocalMutation(action, { invalidateRoute: false });
      setNotice({ error: false, text: success });
      after?.();
      retry();
    } catch {
      setNotice({
        error: true,
        text: t(
          'Kunne ikke lagre. Kontroller verdier og dato, og prøv igjen når denne fanen kan lagre. Det du skrev er beholdt.',
          'Could not save. Check the amount and date, then retry when this tab can save. Your input has been kept.',
        ),
      });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  function invalidAmount() {
    setNotice({
      error: true,
      text: t(
        'Skriv et positivt tall. Repetisjoner må være hele tall. Minutter kan angis til hele sekunder og km til hele meter.',
        'Enter a positive number. Repetitions must be whole numbers; minutes must resolve to whole seconds and km to whole metres.',
      ),
    });
  }
  if (error)
    return (
      <ErrorState
        title={t('Aktivitet kunne ikke lastes', 'Activity could not be loaded')}
        description={t(
          'Ingen summer vises fordi lagrede data ikke kunne leses. Prøv igjen.',
          'Saved records could not be read. Totals are unavailable. Please retry.',
        )}
        action={
          <RpgButton onClick={retry}>{t('Prøv igjen', 'Retry')}</RpgButton>
        }
      />
    );
  if (!data)
    return (
      <LoadingState
        title={t('Laster aktivitet', 'Loading Activity')}
        description={t(
          'Leser lagrede aktiviteter.',
          'Reading saved activities.',
        )}
      />
    );

  const settings = data.activitySettings[0] ?? defaultActivitySettings;
  const definitions = [...builtinActivities, ...data.activityDefinitions];
  const available = definitions.filter((definition) => !definition.archived);
  const activityName = (id: string) =>
    nb && names[id]
      ? names[id]
      : (definitions.find((definition) => definition.id === id)?.name ?? id);
  const definitionFor = (id: string) =>
    definitions.find((definition) => definition.id === id)!;
  const entries = [...data.activityEntries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id),
  );
  const daily = entries.filter((entry) => entry.date === today);
  const dayGoals =
    data.activityDays.find((day) => day.id === today)?.goals ?? settings.goals;
  const enabledGoals = dayGoals.filter((item) => item.enabled);
  const completed = enabledGoals.filter(
    (item) => goalProgress(item, daily).complete,
  ).length;
  const participation = activityParticipation(
    entries.map((entry) => entry.date),
    today,
  );
  const totals = activityTotals(entries, today);
  const disabled = pending || !coordination.canWrite;
  const page = Math.min(
    historyPage,
    Math.max(0, Math.ceil(entries.length / 20) - 1),
  );
  const writeSettings = (goals: ActivityGoal[]) =>
    saveActivitySettings({ ...settings, goals });
  function activitySelect(
    value: string,
    change: (definition: ActivityDefinition) => void,
    label: string,
    includeArchived = false,
  ) {
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(event) => change(definitionFor(event.target.value))}
        >
          {(includeArchived ? definitions : available).map((definition) => (
            <option key={definition.id} value={definition.id}>
              {activityName(definition.id)}
              {definition.archived ? t(' (fjernet)', ' (removed)') : ''}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function unitSelect(
    activityId: string,
    value: ActivityUnit,
    change: (unit: ActivityUnit) => void,
    label: string,
  ) {
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(event) => change(event.target.value as ActivityUnit)}
        >
          {definitionFor(activityId).units.map((unit) => (
            <option key={unit} value={unit}>
              {unitName(unit)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function editEntry(entry: ActivityEntry) {
    setDraft({
      id: entry.id,
      activityId: entry.activityId,
      unit: entry.unit,
      amount: String(displayActivityAmount(entry.amount, entry.unit)),
      date: entry.date,
    });
    selectSection('today');
    setFocusRequest({ target: 'amount' });
  }
  function submitEntry(input: EntryDraft, after: () => void) {
    let amount: number;
    try {
      amount = toActivityAmount(input.amount, input.unit);
    } catch {
      invalidAmount();
      return;
    }
    void mutate(
      () => saveActivityEntry({ ...input, amount, date: input.date || today }),
      t('Aktiviteten er lagret.', 'Activity saved.'),
      after,
    );
  }
  function saveEntry(event: FormEvent) {
    event.preventDefault();
    submitEntry(draft, () =>
      setDraft({
        activityId: draft.activityId,
        unit: draft.unit,
        amount: '',
        date: '',
      }),
    );
  }
  function closeQuickEntry() {
    if (!quickDraft) return;
    setQuickDraft(null);
    setFocusRequest({ target: 'quickLog', goalId: quickDraft.goal.id });
  }
  function quickEntry() {
    if (!quickDraft) return null;
    const { goal: item, amount } = quickDraft;
    return (
      <form
        className="activity-form activity-quick-entry"
        aria-label={`${t('Registrer', 'Log')} ${activityName(item.activityId)}`}
        onSubmit={(event) => {
          event.preventDefault();
          submitEntry(
            {
              activityId: item.activityId,
              unit: item.unit,
              amount,
              date: activityDate(new Date()),
            },
            closeQuickEntry,
          );
        }}
      >
        <fieldset disabled={pending}>
          <label>
            {item.unit === 'reps'
              ? t('Antall', 'Repetitions')
              : item.unit === 'seconds'
                ? t('Minutter', 'Minutes')
                : t('Kilometer', 'Kilometres')}
            <input
              ref={quickInput}
              required
              type="number"
              min="0"
              step="any"
              inputMode={item.unit === 'reps' ? 'numeric' : 'decimal'}
              disabled={!coordination.canWrite}
              value={amount}
              onChange={(event) =>
                setQuickDraft({ ...quickDraft, amount: event.target.value })
              }
            />
          </label>
          <div className="action-row">
            <RpgButton
              type="submit"
              size="sm"
              disabled={!coordination.canWrite}
            >
              {t('Lagre', 'Save')}
            </RpgButton>
            <RpgButton size="sm" variant="quiet" onClick={closeQuickEntry}>
              {t('Avbryt', 'Cancel')}
            </RpgButton>
          </div>
        </fieldset>
      </form>
    );
  }
  function saveGoal(event: FormEvent) {
    event.preventDefault();
    let target: number;
    try {
      target = toActivityAmount(goal.target, goal.unit);
    } catch {
      invalidAmount();
      return;
    }
    const record = {
      ...goal,
      id: goal.id ?? newGoalId(),
      target,
      enabled:
        settings.goals.find((item) => item.id === goal.id)?.enabled ?? true,
    };
    void mutate(
      () =>
        writeSettings([
          ...settings.goals.filter((item) => item.id !== record.id),
          record,
        ]),
      t('Målet er lagret.', 'Goal saved.'),
      () =>
        setGoal({ activityId: goal.activityId, unit: goal.unit, target: '' }),
    );
  }

  return (
    <section
      className="activity-page"
      lang={nb ? 'nb' : 'en'}
      aria-labelledby="activity-title"
    >
      <header className="activity-header">
        <div>
          <h1 id="activity-title">
            <ActivityIcon />
            {t('Aktivitet', 'Activity')}
          </h1>
        </div>
        <div
          className="activity-overview"
          role="group"
          aria-label={t('Aktivitet i dag', 'Activity today')}
        >
          <div
            className="activity-overview__goals"
            data-complete={
              enabledGoals.length > 0 && completed === enabledGoals.length
            }
          >
            <p>{t('Dagens mål', "Today's goals")}</p>
            <p className="activity-overview__count">
              {enabledGoals.length
                ? t(
                    `${completed} av ${enabledGoals.length} mål fullført`,
                    `${completed} of ${enabledGoals.length} goals complete`,
                  )
                : t(
                    'Ingen mål satt. Du kan registrere aktivitet likevel.',
                    'No goals configured. You can still record activity.',
                  )}
            </p>
          </div>
          <dl className="activity-overview__stats">
            <div>
              <dt>Streak</dt>
              <dd>{daysLabel(participation.currentStreak)}</dd>
            </div>
            <div className="activity-overview__level">
              <dt>
                <ActivityIcon />
                {t('Aktivitetsnivå', 'Activity Level')}
              </dt>
              <dd>
                <span>{participation.level}</span>
                <details className="activity-info">
                  <summary
                    aria-label={t('Om aktivitetsnivå', 'About Activity Level')}
                  >
                    (i)
                  </summary>
                  <p>
                    {t(
                      'Sju dager med registrert aktivitet gir ett nytt aktivitetsnivå, uavhengig av mengde. Studienivå og XP påvirkes ikke.',
                      'Seven recorded activity days give one new Activity Level, regardless of amount. Study levels and XP stay unchanged.',
                    )}
                  </p>
                </details>
              </dd>
            </div>
          </dl>
        </div>
      </header>
      <div
        className="activity-tabs"
        role="tablist"
        aria-label={t('Aktivitetsvisning', 'Activity sections')}
      >
        {sections.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item}
            id={`activity-tab-${item}`}
            aria-controls={`activity-section-${item}`}
            aria-selected={section === item}
            tabIndex={section === item ? 0 : -1}
            onClick={() => selectSection(item)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % 3
                  : event.key === 'ArrowLeft'
                    ? (index + 2) % 3
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 2
                        : null;
              if (next === null) return;
              event.preventDefault();
              selectSection(sections[next]);
              document
                .getElementById(`activity-tab-${sections[next]}`)
                ?.focus();
            }}
          >
            {item === 'today'
              ? t('I dag', 'Today')
              : item === 'history'
                ? t('Historikk', 'History')
                : t('Oppsett', 'Settings')}
          </button>
        ))}
      </div>
      <p
        className="activity-feedback"
        role={notice?.error ? 'alert' : 'status'}
      >
        {notice?.text ?? (pending ? t('Lagrer…', 'Saving…') : '')}
      </p>
      {!coordination.canWrite && (
        <p role="note">
          {t(
            'Denne fanen er skrivebeskyttet. Du kan se historikken, men ikke lagre endringer.',
            'This tab is read-only. You can review history, but cannot save changes.',
          )}
        </p>
      )}
      <div
        role="tabpanel"
        id="activity-section-today"
        aria-labelledby="activity-tab-today"
        hidden={section !== 'today'}
        className="activity-section"
      >
        <div className="activity-columns">
          <RpgPanel title={t('Dagens mål', 'Daily goals')} titleAs="h2">
            <ul className="activity-list activity-goals">
              {enabledGoals.map((item) => {
                const progress = goalProgress(item, daily);
                return (
                  <li
                    key={item.id}
                    className="activity-goal"
                    aria-label={activityName(item.activityId)}
                  >
                    <ActivityIcon activityId={item.activityId} />
                    <RpgProgressBar
                      id={`activity-progress-${item.id}`}
                      label={activityName(item.activityId)}
                      helperText={`${showAmount(progress.amount, item.unit)} / ${showAmount(item.target, item.unit)}`}
                      value={Math.min(
                        100,
                        (progress.amount / item.target) * 100,
                      )}
                      tone={progress.complete ? 'success' : 'progress'}
                    />
                    <div className="activity-goal__actions">
                      {progress.complete && (
                        <span className="activity-goal__complete">
                          <ActivityIcon complete />
                          {t('Fullført', 'Complete')}
                        </span>
                      )}
                      {quickDraft?.goal.id === item.id ? (
                        quickEntry()
                      ) : (
                        <RpgButton
                          id={`activity-log-${item.id}`}
                          aria-describedby={`activity-progress-${item.id}`}
                          variant="secondary"
                          size="sm"
                          disabled={
                            disabled ||
                            !!draft.id ||
                            !!quickDraft ||
                            definitionFor(item.activityId).archived
                          }
                          onClick={() => {
                            setQuickDraft({ goal: item, amount: '' });
                            setFocusRequest({ target: 'quick' });
                          }}
                        >
                          {t('Registrer', 'Log')}
                        </RpgButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {quickDraft &&
              !enabledGoals.some((item) => item.id === quickDraft.goal.id) && (
                <div>
                  <h3>{activityName(quickDraft.goal.activityId)}</h3>
                  {quickEntry()}
                </div>
              )}
            {draft.id && (
              <p>
                {t(
                  'Fullfør eller avbryt endringen før du registrerer ny aktivitet.',
                  'Finish or cancel the current edit before logging a new activity.',
                )}
              </p>
            )}
            <RpgButton
              variant="quiet"
              size="sm"
              onClick={() => {
                selectSection('settings');
                setFocusRequest({ target: 'goals' });
              }}
            >
              {t('Endre mål', 'Manage goals')}
            </RpgButton>
          </RpgPanel>
          <RpgPanel titleAs="h2">
            <h2 ref={logHeading} tabIndex={-1}>
              {draft.id
                ? t('Endre registrering', 'Edit entry')
                : t('Registrer aktivitet', 'Log activity')}
            </h2>
            <form className="activity-form" onSubmit={saveEntry}>
              {quickDraft && (
                <p>
                  {t(
                    'Lagre eller avbryt hurtigregistreringen for å bruke skjemaet.',
                    'Save or cancel the quick entry to use this form.',
                  )}
                </p>
              )}
              <fieldset disabled={disabled || !!quickDraft}>
                {activitySelect(
                  draft.activityId,
                  (definition) =>
                    setDraft({
                      ...draft,
                      activityId: definition.id,
                      unit: definition.units[0],
                      amount: '',
                    }),
                  t('Aktivitet', 'Activity type'),
                  !!draft.id,
                )}
                {unitSelect(
                  draft.activityId,
                  draft.unit,
                  (unit) => setDraft({ ...draft, unit, amount: '' }),
                  t('Måleenhet', 'Measurement'),
                )}
                <label>
                  {t('Mengde', 'Amount')}
                  <input
                    ref={amountInput}
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft({ ...draft, amount: event.target.value })
                    }
                  />
                </label>
                <label>
                  {t('Dato', 'Date')}
                  <input
                    required
                    type="date"
                    lang={nb ? 'nb-NO' : 'en-GB'}
                    aria-describedby="activity-date-help"
                    max={today}
                    value={draft.date || today}
                    onChange={(event) =>
                      setDraft({ ...draft, date: event.target.value })
                    }
                  />
                </label>
                <small id="activity-date-help">
                  {t(
                    'Datoformatet følger nettleseren.',
                    'Date format follows your browser.',
                  )}
                </small>
                <div className="action-row">
                  <RpgButton type="submit">
                    {t('Lagre aktivitet', 'Save activity')}
                  </RpgButton>
                  {draft.id && (
                    <RpgButton
                      variant="quiet"
                      onClick={() =>
                        setDraft({
                          activityId: 'pushups',
                          unit: 'reps',
                          amount: '',
                          date: '',
                        })
                      }
                    >
                      {t('Avbryt', 'Cancel')}
                    </RpgButton>
                  )}
                </div>
              </fieldset>
            </form>
          </RpgPanel>
        </div>
      </div>
      <div
        role="tabpanel"
        id="activity-section-history"
        aria-labelledby="activity-tab-history"
        hidden={section !== 'history'}
        className="activity-section"
      >
        <RpgPanel title={t('Historikk', 'History')} titleAs="h2">
          <dl className="activity-metrics">
            <div>
              <dt>{t('Aktive dager', 'Active days')}</dt>
              <dd>
                {t(
                  `${participation.activeDays} ${participation.activeDays === 1 ? 'aktiv dag' : 'aktive dager'}`,
                  daysLabel(participation.activeDays),
                )}
              </dd>
            </div>
            <div>
              <dt>{t('Streak nå', 'Current streak')}</dt>
              <dd>{daysLabel(participation.currentStreak)}</dd>
            </div>
            <div>
              <dt>{t('Lengste streak', 'Longest streak')}</dt>
              <dd>{daysLabel(participation.bestStreak)}</dd>
            </div>
          </dl>
          <p>
            {t(
              `${daysLabel(participation.daysToNextLevel)} med aktivitet til neste aktivitetsnivå.`,
              `${daysLabel(participation.daysToNextLevel)} with activity to the next Activity Level.`,
            )}
          </p>
          {totals.length === 0 ? (
            <p>
              {t(
                'Ingen aktivitet registrert ennå.',
                'No activity recorded yet.',
              )}
            </p>
          ) : (
            <div className="activity-table-wrap">
              <table className="activity-table" role="table">
                <caption className="sr-only">
                  {t('Aktivitetssummer', 'Activity totals')}
                </caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">
                      {t('Aktivitet / enhet', 'Activity / unit')}
                    </th>
                    <th scope="col" role="columnheader">
                      {t('Siste 28 dager', 'Last 28 days')}
                    </th>
                    <th scope="col" role="columnheader">
                      {t('Totalt', 'Lifetime')}
                    </th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {totals.map((row) => (
                    <tr key={`${row.activityId}:${row.unit}`} role="row">
                      <th scope="row" role="rowheader">
                        {activityName(row.activityId)} ({unitName(row.unit)})
                      </th>
                      <td role="cell">
                        <span
                          className="activity-total-label"
                          aria-hidden="true"
                        >
                          {t('Siste 28 dager', 'Last 28 days')}:
                        </span>
                        <span>{showAmount(row.recent, row.unit)}</span>
                      </td>
                      <td role="cell">
                        <span
                          className="activity-total-label"
                          aria-hidden="true"
                        >
                          {t('Totalt', 'Lifetime')}:
                        </span>
                        <span>{showAmount(row.lifetime, row.unit)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3 ref={historyHeading} tabIndex={-1}>
            {t('Registreringer', 'Entries')}
          </h3>
          {draft.id && (
            <RpgButton
              size="sm"
              variant="quiet"
              onClick={() => {
                selectSection('today');
                setFocusRequest({ target: 'amount' });
              }}
            >
              {t('Fortsett endring', 'Continue editing')}
            </RpgButton>
          )}
          <ol className="activity-list">
            {entries.slice(page * 20, page * 20 + 20).map((entry) => (
              <li key={entry.id}>
                <div>
                  <time dateTime={entry.date}>{showDate(entry.date)}</time> ·{' '}
                  <strong>{activityName(entry.activityId)}</strong> ·{' '}
                  {showAmount(entry.amount, entry.unit)}
                </div>
                <div className="action-row">
                  <RpgButton
                    size="sm"
                    variant="quiet"
                    disabled={disabled || !!draft.id || !!quickDraft}
                    onClick={() => editEntry(entry)}
                  >
                    {t('Endre', 'Edit')}
                  </RpgButton>
                  <RpgButton
                    size="sm"
                    variant="quiet"
                    disabled={disabled}
                    onClick={() => setDeleteId(entry.id)}
                  >
                    {t('Slett', 'Delete')}
                  </RpgButton>
                </div>
                {deleteId === entry.id && (
                  <div>
                    <p>
                      {t(
                        'Slette denne registreringen? Summer og aktivitetsnivå beregnes på nytt.',
                        'Delete this entry? Totals and Activity Level will be recalculated.',
                      )}
                    </p>
                    <div className="action-row">
                      <RpgButton
                        size="sm"
                        variant="danger"
                        disabled={disabled}
                        onClick={() => {
                          void mutate(
                            () => deleteActivityEntry(entry.id),
                            t('Registreringen er slettet.', 'Entry deleted.'),
                            () => {
                              setDeleteId(null);
                              historyHeading.current?.focus({
                                preventScroll: true,
                              });
                              if (draft.id === entry.id)
                                setDraft({
                                  activityId: 'pushups',
                                  unit: 'reps',
                                  amount: '',
                                  date: '',
                                });
                            },
                          );
                        }}
                      >
                        {t('Bekreft sletting', 'Confirm deletion')}
                      </RpgButton>
                      <RpgButton
                        size="sm"
                        variant="quiet"
                        disabled={pending}
                        onClick={() => setDeleteId(null)}
                      >
                        {t('Behold', 'Keep entry')}
                      </RpgButton>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {entries.length > 20 && (
            <div className="action-row">
              <RpgButton
                variant="quiet"
                disabled={page === 0}
                onClick={() => setHistoryPage(page - 1)}
              >
                {t('Nyere', 'Newer')}
              </RpgButton>
              <span>
                {page + 1} / {Math.ceil(entries.length / 20)}
              </span>
              <RpgButton
                variant="quiet"
                disabled={(page + 1) * 20 >= entries.length}
                onClick={() => setHistoryPage(page + 1)}
              >
                {t('Eldre', 'Older')}
              </RpgButton>
            </div>
          )}
          <h3>{t('Siste sju dager', 'Last seven days')}</h3>
          <ul className="activity-list">
            {recentActivityDays(
              entries,
              data.activityDays,
              today,
              settings.goals,
            ).map((day) => (
              <li key={day.date}>
                <time dateTime={day.date}>{showDate(day.date)}</time> ·{' '}
                {day.active
                  ? t('Aktivitet registrert', 'Activity recorded')
                  : t('Ingen aktivitet', 'No activity')}
                {day.goalStatusKnown && day.configured > 0 && (
                  <>
                    {' '}
                    ·{' '}
                    {t(
                      `${day.complete} av ${day.configured} mål fullført`,
                      `${day.complete} of ${day.configured} goals complete`,
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </RpgPanel>
      </div>
      <div
        role="tabpanel"
        id="activity-section-settings"
        aria-labelledby="activity-tab-settings"
        hidden={section !== 'settings'}
        className="activity-section"
      >
        <RpgPanel titleAs="h2" id="activity-goals">
          <h2 ref={goalHeading} tabIndex={-1}>
            {t('Daglige mål', 'Daily goals')}
          </h2>
          <p>
            {t(
              'Sett dine egne mål. Endringer gjelder fra i dag og endrer ikke tidligere dager.',
              'Set your own goals. Changes apply from today and leave earlier days unchanged.',
            )}
          </p>
          <details className="activity-info">
            <summary>
              {t('Om mål og historikk', 'About goals and history')}
            </summary>
            <p>
              {t(
                'Registrerer du aktivitet på en tidligere dato uten kjente mål, antar vi ingen mål for den dagen.',
                'If you add activity to an earlier date with no known goals, no goals are assumed for that day.',
              )}
            </p>
          </details>
          <ul className="activity-list">
            {settings.goals.map((item) => (
              <li key={item.id}>
                {activityName(item.activityId)} ·{' '}
                {showAmount(item.target, item.unit)} ·{' '}
                {item.enabled
                  ? t('Aktivt', 'Enabled')
                  : t('Slått av', 'Disabled')}
                <div className="action-row">
                  <RpgButton
                    variant="quiet"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      setGoal({
                        ...item,
                        target: String(
                          displayActivityAmount(item.target, item.unit),
                        ),
                      });
                      goalHeading.current?.focus();
                    }}
                  >
                    {t('Endre mål', 'Edit goal')}
                  </RpgButton>
                  <RpgButton
                    variant="quiet"
                    size="sm"
                    disabled={
                      disabled ||
                      (!item.enabled && definitionFor(item.activityId).archived)
                    }
                    onClick={() => {
                      void mutate(
                        () =>
                          writeSettings(
                            settings.goals.map((row) =>
                              row.id === item.id
                                ? { ...row, enabled: !row.enabled }
                                : row,
                            ),
                          ),
                        t('Målet er oppdatert.', 'Goal updated.'),
                      );
                    }}
                  >
                    {item.enabled
                      ? t('Slå av', 'Disable')
                      : t('Slå på', 'Enable')}
                  </RpgButton>
                  <RpgButton
                    variant="quiet"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      void mutate(
                        () =>
                          writeSettings(
                            settings.goals.filter((row) => row.id !== item.id),
                          ),
                        t(
                          'Målet er fjernet. Tidligere dager er beholdt.',
                          'Goal removed. Earlier days are preserved.',
                        ),
                        () => {
                          goalHeading.current?.focus({ preventScroll: true });
                          if (goal.id === item.id)
                            setGoal({
                              activityId: 'pushups',
                              unit: 'reps',
                              target: '',
                            });
                        },
                      );
                    }}
                  >
                    {t('Fjern mål', 'Remove goal')}
                  </RpgButton>
                </div>
              </li>
            ))}
          </ul>
          <form className="activity-form" onSubmit={saveGoal}>
            <fieldset disabled={disabled}>
              {activitySelect(
                goal.activityId,
                (definition) =>
                  setGoal({
                    ...goal,
                    activityId: definition.id,
                    unit: definition.units[0],
                    target: '',
                  }),
                t('Målaktivitet', 'Goal activity'),
                !!goal.id,
              )}
              {unitSelect(
                goal.activityId,
                goal.unit,
                (unit) => setGoal({ ...goal, unit, target: '' }),
                t('Målenhet', 'Goal measurement'),
              )}
              <label>
                {goal.unit === 'reps'
                  ? t('Repetisjoner per dag', 'Repetitions per day')
                  : goal.unit === 'seconds'
                    ? t('Minutter per dag', 'Minutes per day')
                    : t('Kilometer per dag', 'Kilometres per day')}
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={goal.target}
                  onChange={(event) =>
                    setGoal({ ...goal, target: event.target.value })
                  }
                />
              </label>
              <div className="action-row">
                <RpgButton type="submit">
                  {goal.id
                    ? t('Lagre mål', 'Save goal')
                    : t('Legg til mål', 'Add goal')}
                </RpgButton>
                {goal.id && (
                  <RpgButton
                    variant="quiet"
                    onClick={() =>
                      setGoal({
                        activityId: 'pushups',
                        unit: 'reps',
                        target: '',
                      })
                    }
                  >
                    {t('Avbryt målendring', 'Cancel goal edit')}
                  </RpgButton>
                )}
              </div>
            </fieldset>
          </form>
        </RpgPanel>
        <RpgPanel titleAs="h2">
          <h2 ref={customHeading} tabIndex={-1}>
            {t('Egne aktiviteter', 'Custom activities')}
          </h2>
          <details className="activity-info">
            <summary>
              {t('Om egne aktiviteter', 'About custom activities')}
            </summary>
            <p>
              {t(
                'Fjernede aktiviteter blir borte fra valgene, men historikken beholdes. Måleenheten kan ikke endres etter opprettelse.',
                'Removing an activity hides it from choices and disables its goals; history is kept. Its measurement cannot change after creation.',
              )}
            </p>
          </details>
          <ul className="activity-list">
            {data.activityDefinitions.map((definition) => (
              <li key={definition.id}>
                {definition.name} ({unitName(definition.units[0])}){' '}
                {definition.archived ? t('— fjernet', '— removed') : ''}
                <div className="action-row">
                  <RpgButton
                    size="sm"
                    variant="quiet"
                    disabled={disabled}
                    onClick={() => {
                      setCustom({
                        id: definition.id,
                        name: definition.name,
                        unit: definition.units[0],
                      });
                      customHeading.current?.focus();
                    }}
                  >
                    {t('Gi nytt navn', 'Rename')}
                  </RpgButton>
                  <RpgButton
                    size="sm"
                    variant="quiet"
                    disabled={disabled}
                    onClick={() => {
                      void mutate(
                        () =>
                          saveActivityDefinition({
                            id: definition.id,
                            name: definition.name,
                            archived: !definition.archived,
                          }),
                        t('Aktiviteten er oppdatert.', 'Activity updated.'),
                      );
                    }}
                  >
                    {definition.archived
                      ? t('Gjenopprett', 'Restore activity')
                      : t('Fjern aktivitet', 'Remove activity')}
                  </RpgButton>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="activity-form"
            onSubmit={(event) => {
              event.preventDefault();
              void mutate(
                () => saveActivityDefinition(custom),
                t('Egen aktivitet er lagret.', 'Custom activity saved.'),
                () => setCustom({ name: '', unit: 'reps' }),
              );
            }}
          >
            <fieldset disabled={disabled}>
              <label>
                {t('Aktivitetsnavn', 'Activity name')}
                <input
                  required
                  maxLength={80}
                  value={custom.name}
                  onChange={(event) =>
                    setCustom({ ...custom, name: event.target.value })
                  }
                />
              </label>
              <label>
                {t('Egen måleenhet', 'Custom measurement')}
                <select
                  disabled={!!custom.id}
                  value={custom.unit}
                  onChange={(event) =>
                    setCustom({
                      ...custom,
                      unit: event.target.value as ActivityUnit,
                    })
                  }
                >
                  {(['reps', 'seconds', 'metres'] as const).map((unit) => (
                    <option key={unit} value={unit}>
                      {unitName(unit)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="action-row">
                <RpgButton type="submit">
                  {custom.id
                    ? t('Lagre navn', 'Save name')
                    : t('Legg til aktivitet', 'Add activity')}
                </RpgButton>
                {custom.id && (
                  <RpgButton
                    variant="quiet"
                    onClick={() => setCustom({ name: '', unit: 'reps' })}
                  >
                    {t('Avbryt navneendring', 'Cancel rename')}
                  </RpgButton>
                )}
              </div>
            </fieldset>
          </form>
        </RpgPanel>
        <RpgPanel title={t('Pausevarsel', 'Movement breaks')} titleAs="h2">
          <p>
            {t(
              'Få et varsel om å ta en pause mens du bruker ProgressPal.',
              'Get a reminder to take a break while using ProgressPal.',
            )}
          </p>
          <details className="activity-info">
            <summary>
              {t('Slik virker pausevarselet', 'How movement reminders work')}
            </summary>
            <p>
              {t(
                'Varselet teller bare aktiv bruk av denne fanen. Det ser ikke hva du gjør i andre apper, eller om du beveger deg. Tid i bakgrunnen telles ikke, og ingen aktivitet registreres automatisk.',
                'The reminder counts active use of this tab only. It cannot see other apps or detect movement. Background time does not count, and no activity is logged automatically.',
              )}
            </p>
          </details>
          <label>
            {t('Varselintervall', 'Reminder interval')}
            <select
              disabled={disabled}
              value={settings.reminderMinutes}
              onChange={(event) => {
                const reminderMinutes = Number(
                  event.target.value,
                ) as typeof settings.reminderMinutes;
                void mutate(
                  () => saveActivitySettings({ ...settings, reminderMinutes }),
                  t(
                    'Varselinnstillingen er lagret.',
                    'Reminder preference saved.',
                  ),
                );
              }}
            >
              {[0, 30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes === 0 ? t('Av', 'Off') : `${minutes} min`}
                </option>
              ))}
            </select>
          </label>
        </RpgPanel>
      </div>
    </section>
  );
}
