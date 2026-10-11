import { useEffect, useRef, useState, type ReactNode } from 'react';

import type {
  LessonExercise,
  LessonExerciseOf,
  LessonUiCopy,
} from '@/lib/domain';

import type { AnswerDraft } from './drafts';
import { InlineText, Markup, type MarkupContext } from './markup';
import { formatCopy, shuffledOrder } from './model';
import { useLessonSurfaces } from './presentation';
import {
  moveOrderItem,
  type ProgressCheckAvailability,
  type ProgressCheckCount,
  type ProgressCheckNeed,
} from './progressCheck';

/**
 * Answer widgets, one per authored response mode (DC-09 to DC-13). Every
 * control is a native, labelled form control: nothing is drag-only (sorting
 * and ordering are built from native selects and buttons), choices are
 * shuffled at delivery and evaluated by option ID (DC-10), and structured
 * items keep partial progress while editing (DC-13). Widgets never show
 * answer keys, evaluator wording or hidden variants.
 */

type WidgetProps<Type extends LessonExercise['type']> = {
  readonly context: MarkupContext;
  readonly copy: LessonUiCopy;
  readonly disabled: boolean;
  readonly draft: AnswerDraft;
  readonly exercise: LessonExerciseOf<Type>;
  readonly idPrefix: string;
  readonly onChange: (draft: AnswerDraft) => void;
  /** For a sort result: which items were in their right place, else null. */
  readonly review?: readonly boolean[] | null;
  readonly seed: string;
  /**
   * Only for an ordering task the programme opened to it: the check of the
   * work so far, and with it the move controls and compact list.
   */
  readonly progressCheck?: ProgressCheckView;
};

export type ProgressCheckView = {
  /** False while a submitted answer is shown read-only beside its result. */
  readonly answering: boolean;
  readonly availability: ProgressCheckAvailability;
  readonly need: ProgressCheckNeed;
  readonly result: ProgressCheckCount | null;
  readonly onCheck: () => void;
};

/** Status-code options keep their significant leading blanks (authored rule). */
function OptionText({
  context,
  text,
}: {
  context: MarkupContext;
  text: string;
}) {
  return /^[ ?AMDR!]{2} \S/.test(text) ? (
    <code className="lesson-mono" lang={context.technicalLanguage}>
      {text}
    </code>
  ) : (
    <InlineText context={context} text={text} />
  );
}

function CodeView({ code, context }: { code: string; context: MarkupContext }) {
  return (
    <div className="lesson-pre">
      <pre tabIndex={0} lang={context.technicalLanguage}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ChoiceList({
  context,
  disabled,
  idPrefix,
  multi,
  name,
  onSelect,
  options,
  selected,
  seed,
}: {
  context: MarkupContext;
  disabled: boolean;
  idPrefix: string;
  multi: boolean;
  name: string;
  onSelect: (selected: string[]) => void;
  options: ReadonlyArray<{ id: string; text: string }>;
  selected: readonly string[];
  seed: string;
}) {
  return (
    <div className="lesson-choices">
      {shuffledOrder(options.length, seed).map((optionIndex) => {
        const option = options[optionIndex]!;
        const inputId = `${idPrefix}-${name}-${option.id}`;

        return (
          <label className="checkbox" htmlFor={inputId} key={option.id}>
            <input
              checked={selected.includes(option.id)}
              disabled={disabled}
              id={inputId}
              name={`${idPrefix}-${name}`}
              onChange={(event) =>
                onSelect(
                  multi
                    ? event.target.checked
                      ? [...selected, option.id]
                      : selected.filter((id) => id !== option.id)
                    : [option.id],
                )
              }
              type={multi ? 'checkbox' : 'radio'}
              value={option.id}
            />
            <span>
              <OptionText context={context} text={option.text} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

function McqWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
  seed,
}: WidgetProps<'mcq'>) {
  return (
    <fieldset className="lesson-fieldset">
      <legend className="sr-only">{copy.text.answerLabel}</legend>
      {exercise.multi ? <p>{copy.text.selectAll}</p> : null}
      <ChoiceList
        context={context}
        disabled={disabled}
        idPrefix={idPrefix}
        multi={exercise.multi}
        name="option"
        onSelect={(selected) => onChange({ selected })}
        options={exercise.options}
        selected={draft.selected as string[]}
        seed={`${seed}|options`}
      />
    </fieldset>
  );
}

function SelectControl({
  disabled,
  id,
  label,
  mark,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  id: string;
  label: ReactNode;
  /** The result of this row after a submission, outside the label. */
  mark?: ReactNode;
  onChange: (value: string) => void;
  options: ReadonlyArray<{
    label: string;
    value: string;
    unavailable?: boolean;
  }>;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="lesson-field">
      <label htmlFor={id}>{label}</label>
      <select
        className="field-control select-input"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            disabled={option.unavailable}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      {mark ?? null}
    </div>
  );
}

function SortWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
  progressCheck,
  review,
  seed,
}: WidgetProps<'sort'>) {
  const order = shuffledOrder(exercise.items.length, `${seed}|items`);

  if (exercise.kind === 'classify') {
    const categories = draft.categories as string[];

    return (
      <div className="lesson-fieldset">
        {order.map((itemIndex) => (
          <SelectControl
            disabled={disabled}
            id={`${idPrefix}-item-${itemIndex}`}
            key={itemIndex}
            label={
              <InlineText
                context={context}
                text={exercise.items[itemIndex]![0]!}
              />
            }
            onChange={(value) => {
              const next = [...categories];
              next[itemIndex] = value;
              onChange({ categories: next });
            }}
            options={(exercise.categories ?? []).map((category) => ({
              label: category,
              value: category,
            }))}
            placeholder={copy.text.chooseOption}
            value={categories[itemIndex] ?? ''}
          />
        ))}
      </div>
    );
  }

  if (exercise.kind === 'order') {
    return (
      <OrderWidget
        context={context}
        copy={copy}
        disabled={disabled}
        draft={draft}
        exercise={exercise}
        idPrefix={idPrefix}
        onChange={onChange}
        {...(progressCheck === undefined ? {} : { progressCheck })}
        review={review}
        seed={seed}
      />
    );
  }

  const matches = draft.matches as string[];
  const rights = [
    ...exercise.items.map((item) => item[1] ?? ''),
    ...exercise.distractors,
  ];
  const rightOrder = shuffledOrder(rights.length, `${seed}|right`);

  return (
    <div className="lesson-fieldset">
      <p>{copy.text.matchInstruction}</p>
      {exercise.items.map((item, itemIndex) => (
        <SelectControl
          disabled={disabled}
          id={`${idPrefix}-item-${itemIndex}`}
          key={itemIndex}
          label={<InlineText context={context} text={item[0]!} />}
          mark={
            review ? (
              <strong>
                {review[itemIndex]
                  ? copy.text.matchRight
                  : copy.text.matchWrong}
              </strong>
            ) : null
          }
          onChange={(value) => {
            const next = [...matches];
            next[itemIndex] = value;
            onChange({ matches: next });
          }}
          options={rightOrder.map((index) => ({
            label: rights[index]!,
            value: rights[index]!,
            // Each answer is used once: one already chosen in another row is
            // not offered here, so nothing has to be remembered.
            unavailable: matches.some(
              (chosen, other) =>
                other !== itemIndex && chosen === rights[index],
            ),
          }))}
          placeholder={copy.text.chooseOption}
          value={matches[itemIndex] ?? ''}
        />
      ))}
    </div>
  );
}

/**
 * Ordering by choosing one step at a time: the learner builds the sequence
 * from the first place onwards instead of keeping ten selections in mind.
 * Plain buttons and a list, so it works by keyboard and touch; a placed step
 * can be removed again. After a wrong submission each place says whether it
 * was right, and a retry keeps the right places.
 *
 * A task the programme opened to the check of the work so far
 * (`progressCheck`, Task 6) also says how many steps are placed, lists the
 * places only up to the next empty one, lets a placed step move one place up
 * or down without touching the others, and offers that limited check. Every
 * other ordering task renders exactly as before.
 */
function OrderWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
  progressCheck,
  review,
  seed,
}: WidgetProps<'sort'>) {
  const surfaces = useLessonSurfaces();
  const positions = draft.positions as number[];
  const poolRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  // The step whose pool button should take focus after a change, or -1 for
  // the first remaining one: focus must not fall to the page when a button
  // leaves the pool.
  const focusItem = useRef<number | null>(null);
  // After a move, focus stays on the moved step's control in the direction
  // it moved, or on its other move control once it reaches an end.
  const focusMove = useRef<{
    readonly item: number;
    readonly direction: 'up' | 'down';
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const total = exercise.items.length;
  const itemText = (index: number) => exercise.items[index]![0]!;
  // Spoken names carry no markup characters: `cd kode` is read as cd kode.
  const spoken = (index: number) => itemText(index).replace(/[`*]/g, '');
  const slotItems = Array.from({ length: total }, (_, slot) =>
    positions.findIndex((position) => position === slot + 1),
  );
  const pool = shuffledOrder(total, `${seed}|items`).filter(
    (index) => !positions[index],
  );
  const placed = positions.filter((position) => position > 0).length;
  const lastFilled = slotItems.reduce(
    (last, item, slot) => (item === -1 ? last : slot + 1),
    0,
  );
  const shownSlots =
    progressCheck === undefined
      ? slotItems
      : slotItems.slice(0, Math.min(total, lastFilled + 1));

  useEffect(() => {
    const moved = focusMove.current;

    if (moved !== null) {
      focusMove.current = null;
      const control = (direction: 'up' | 'down') =>
        listRef.current?.querySelector<HTMLButtonElement>(
          `[data-move="${direction}-${moved.item}"]`,
        );
      const same = control(moved.direction);

      (same && !same.disabled
        ? same
        : control(moved.direction === 'up' ? 'down' : 'up')
      )?.focus();
      return;
    }

    if (focusItem.current === null) {
      return;
    }

    const wanted =
      focusItem.current >= 0
        ? poolRef.current?.querySelector<HTMLButtonElement>(
            `[data-item="${focusItem.current}"]`,
          )
        : null;

    focusItem.current = null;
    (
      wanted ??
      poolRef.current?.querySelector<HTMLButtonElement>('button') ??
      listRef.current
    )?.focus();
  }, [positions]);

  function place(index: number) {
    const slot = slotItems.findIndex((item) => item === -1) + 1;

    if (slot === 0) {
      return;
    }

    const next = [...positions];

    next[index] = slot;
    focusItem.current = -1;
    setAnnouncement(
      formatCopy(copy, 'orderPlaced', { item: spoken(index), n: slot }),
    );
    onChange({ positions: next });
  }

  function remove(index: number) {
    const next = [...positions];

    next[index] = 0;
    focusItem.current = index;
    setAnnouncement(formatCopy(copy, 'orderRemoved', { item: spoken(index) }));
    onChange({ positions: next });
  }

  function move(index: number, offset: -1 | 1) {
    const next = moveOrderItem(positions, index, offset);

    focusMove.current = { item: index, direction: offset < 0 ? 'up' : 'down' };
    setAnnouncement(
      formatCopy(copy, 'orderMoved', { item: spoken(index), n: next[index]! }),
    );
    onChange({ positions: next });
  }

  const mark = (itemIndex: number) =>
    review ? (
      <strong>
        {review[itemIndex] ? copy.text.orderRight : copy.text.orderWrong}
      </strong>
    ) : null;

  return (
    <div className="lesson-fieldset">
      <p>
        {copy.text.orderInstruction}
        {progressCheck === undefined
          ? null
          : ` ${copy.text.orderMoveInstruction}`}
      </p>
      {progressCheck === undefined ? null : (
        <p>{formatCopy(copy, 'orderPlacedCount', { placed, total })}</p>
      )}
      <ol
        aria-label={copy.text.orderListLabel}
        className="lesson-order"
        ref={listRef}
        tabIndex={-1}
      >
        {shownSlots.map((itemIndex, slot) => (
          <li key={slot}>
            {itemIndex === -1 ? (
              <span>{copy.text.orderEmptySlot}</span>
            ) : progressCheck === undefined ? (
              <>
                <InlineText context={context} text={itemText(itemIndex)} />{' '}
                {mark(itemIndex)}
                {disabled ? null : (
                  <button
                    aria-label={formatCopy(copy, 'orderRemove', {
                      item: spoken(itemIndex),
                    })}
                    className={surfaces.quiet}
                    onClick={() => remove(itemIndex)}
                    type="button"
                  >
                    {copy.text.orderRemoveButton}
                  </button>
                )}
              </>
            ) : (
              <div className="action-row">
                <span className="lesson-order__name">
                  <InlineText context={context} text={itemText(itemIndex)} />
                </span>
                <span className="action-row lesson-order__side">
                  {mark(itemIndex)}
                  {progressCheck.answering ? (
                    <>
                      <button
                        aria-label={formatCopy(copy, 'orderMoveUp', {
                          item: spoken(itemIndex),
                        })}
                        className={surfaces.quietSmall}
                        data-move={`up-${itemIndex}`}
                        disabled={disabled || slot === 0}
                        onClick={() => move(itemIndex, -1)}
                        type="button"
                      >
                        {copy.text.orderMoveUpButton}
                      </button>
                      <button
                        aria-label={formatCopy(copy, 'orderMoveDown', {
                          item: spoken(itemIndex),
                        })}
                        className={surfaces.quietSmall}
                        data-move={`down-${itemIndex}`}
                        disabled={disabled || slot === total - 1}
                        onClick={() => move(itemIndex, 1)}
                        type="button"
                      >
                        {copy.text.orderMoveDownButton}
                      </button>
                      <button
                        aria-label={formatCopy(copy, 'orderRemove', {
                          item: spoken(itemIndex),
                        })}
                        className={surfaces.quietSmall}
                        disabled={disabled}
                        onClick={() => remove(itemIndex)}
                        type="button"
                      >
                        {copy.text.orderRemoveButton}
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div
        aria-label={copy.text.orderPoolLabel}
        className="action-row"
        ref={poolRef}
        role="group"
      >
        {pool.map((index) => (
          <button
            aria-label={formatCopy(copy, 'orderAdd', { item: spoken(index) })}
            className={surfaces.secondary}
            data-item={index}
            disabled={disabled}
            key={index}
            onClick={() => place(index)}
            type="button"
          >
            <InlineText context={context} text={itemText(index)} />
          </button>
        ))}
      </div>
      {progressCheck?.answering ? (
        <ProgressCheckControls
          check={progressCheck}
          copy={copy}
          disabled={disabled}
          helpId={`${idPrefix}-check-help`}
          placed={placed}
        />
      ) : null}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}

/** Everyday number words for a short instruction ("tre steg"). */
const countWords = [
  'null',
  'ett',
  'to',
  'tre',
  'fire',
  'fem',
  'seks',
  'syv',
  'åtte',
  'ni',
  'ti',
] as const;

/**
 * The check of the work so far: a short note that it is free, one line that
 * says what remains before the next check (or that it is available), and,
 * after a check, how many placed steps stood right with one next step. It
 * never names a step or a place.
 */
function ProgressCheckControls({
  check,
  copy,
  disabled,
  helpId,
  placed,
}: {
  check: ProgressCheckView;
  copy: LessonUiCopy;
  disabled: boolean;
  helpId: string;
  placed: number;
}) {
  const surfaces = useLessonSurfaces();
  const { availability, need, result } = check;
  const n = formatCount(need.place);
  const help =
    availability.status === 'available'
      ? formatCopy(copy, 'progressCheckLeft', { left: availability.left })
      : availability.reason === 'first'
        ? formatCopy(
            copy,
            placed === 0 ? 'progressCheckFirst' : 'progressCheckMore',
            { n },
          )
        : availability.reason === 'second'
          ? need.place === 0
            ? copy.text.progressCheckRearrange
            : formatCopy(
                copy,
                need.rearrange ? 'progressCheckBoth' : 'progressCheckSecond',
                { n },
              )
          : availability.reason === 'nearly_complete'
            ? copy.text.progressCheckNearlyDone
            : copy.text.progressCheckUsed;
  const guidance =
    result === null
      ? null
      : result.correct === result.placed
        ? copy.text.progressCheckAllRight
        : result.correct === 0
          ? copy.text.progressCheckNoneRight
          : copy.text.progressCheckSomeRight;

  return (
    <div className="lesson-field">
      <div className="action-row">
        <button
          aria-describedby={helpId}
          className={surfaces.secondary}
          disabled={disabled || availability.status !== 'available'}
          onClick={check.onCheck}
          type="button"
        >
          {copy.text.progressCheckButton}
        </button>
        <span id={helpId}>{help}</span>
      </div>
      <p>{copy.text.progressCheckRule}</p>
      <div className="lesson-field" role="status">
        {result === null ? null : (
          <>
            <p>
              {formatCopy(copy, 'progressCheckResult', {
                correct: result.correct,
                placed: result.placed,
              })}
            </p>
            <p>{guidance}</p>
          </>
        )}
      </div>
    </div>
  );
}

function formatCount(count: number): string {
  return countWords[count] ?? String(count);
}

function AssembleWidget({
  context,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
  seed,
}: WidgetProps<'assemble'>) {
  const slots = draft.slots as string[];

  return (
    <div className="lesson-fieldset">
      {exercise.slots.map((slot, slotIndex) => (
        <fieldset className="lesson-fieldset" key={slotIndex}>
          <legend>
            <strong>{slot.label}</strong>
          </legend>
          <ChoiceList
            context={context}
            disabled={disabled}
            idPrefix={`${idPrefix}-slot-${slotIndex}`}
            multi={false}
            name="option"
            onSelect={([optionId]) => {
              const next = [...slots];
              next[slotIndex] = optionId ?? '';
              onChange({ slots: next });
            }}
            options={slot.options}
            selected={slots[slotIndex] ? [slots[slotIndex]!] : []}
            seed={`${seed}|slot${slotIndex}`}
          />
        </fieldset>
      ))}
    </div>
  );
}

function FillWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'fill'>) {
  const blanks = draft.blanks as string[];
  const parts = exercise.template.split('___');

  return (
    <div className="lesson-pre">
      <pre tabIndex={0} lang={context.technicalLanguage}>
        <code>
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 ? (
                <input
                  aria-label={formatCopy(copy, 'blankLabel', { n: index + 1 })}
                  className="field-control lesson-blank"
                  disabled={disabled}
                  id={`${idPrefix}-blank-${index}`}
                  onChange={(event) => {
                    const next = [...blanks];
                    next[index] = event.target.value;
                    onChange({ blanks: next });
                  }}
                  spellCheck={false}
                  value={blanks[index] ?? ''}
                />
              ) : null}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function TextAnswer({
  disabled,
  id,
  label,
  monospace,
  onChange,
  rows = 5,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  monospace: boolean;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <div className="lesson-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        className={`field-control text-area${monospace ? ' lesson-mono' : ''}`}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck={!monospace}
        value={value}
      />
    </div>
  );
}

function predictHow(exercise: LessonExerciseOf<'predict'>, copy: LessonUiCopy) {
  if (!exercise.stdin) {
    return copy.text.predictHowNoInput;
  }

  const stdin = exercise.stdin.replace(/\n$/, '').replace(/\n/g, ' ↵ ');
  return formatCopy(
    copy,
    /\n./.test(exercise.stdin) ? 'predictHowInputMulti' : 'predictHowInput',
    { stdin },
  );
}

function PredictWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'predict'>) {
  return (
    <>
      <CodeView code={exercise.code} context={context} />
      <p>
        <em>{copy.text.howPrefix}</em> {predictHow(exercise, copy)}
      </p>
      <TextAnswer
        disabled={disabled}
        id={`${idPrefix}-text`}
        label={copy.text.answerLabel}
        monospace
        onChange={(text) => onChange({ text })}
        value={draft.text as string}
      />
    </>
  );
}

function TraceWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  onChange,
}: WidgetProps<'trace'>) {
  const cells = draft.cells as string[][];

  return (
    <>
      <CodeView code={exercise.code} context={context} />
      <p>
        {formatCopy(copy, 'traceInstruction', {
          vars: exercise.vars.join(', '),
        })}
      </p>
      <div className="lesson-table">
        <table className="insights-table">
          <thead>
            <tr>
              <th scope="col">{copy.text.traceLine}</th>
              {exercise.vars.map((name) => (
                <th key={name} lang={context.technicalLanguage} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exercise.table.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th scope="row">{row[0]}</th>
                {exercise.vars.map((name, column) => (
                  <td key={name}>
                    <input
                      aria-label={formatCopy(copy, 'traceCellLabel', {
                        name,
                        line: row[0] ?? '',
                      })}
                      className="field-control lesson-mono"
                      disabled={disabled}
                      onChange={(event) => {
                        const next = cells.map((entry) => [...entry]);
                        next[rowIndex]![column] = event.target.value;
                        onChange({ cells: next });
                      }}
                      spellCheck={false}
                      value={cells[rowIndex]?.[column] ?? ''}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CmdWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'cmd'>) {
  return (
    <>
      {exercise.context ? (
        <Markup context={context} text={exercise.context} />
      ) : null}
      <p>
        <em>{copy.text.howPrefix}</em>{' '}
        <InlineText context={context} text={exercise.how ?? copy.text.cmdHow} />
      </p>
      <div className="lesson-field">
        <label htmlFor={`${idPrefix}-command`}>{copy.text.answerLabel}</label>
        <input
          autoComplete="off"
          className="field-control text-input lesson-mono"
          disabled={disabled}
          id={`${idPrefix}-command`}
          lang={context.technicalLanguage}
          onChange={(event) => onChange({ command: event.target.value })}
          spellCheck={false}
          value={draft.command as string}
        />
      </div>
    </>
  );
}

function DiagnoseWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
  seed,
}: WidgetProps<'diagnose'>) {
  return (
    <>
      <CodeView code={exercise.code} context={context} />
      <p>{copy.text.pythonAnswered}</p>
      <CodeView code={exercise.terminal} context={context} />
      <p>{copy.text.diagnoseIntro}</p>
      <SelectControl
        disabled={disabled}
        id={`${idPrefix}-type`}
        label={copy.text.diagnoseType}
        onChange={(errorType) => onChange({ ...draft, errorType })}
        options={exercise.type_options.map((type) => ({
          label: type,
          value: type,
        }))}
        placeholder={copy.text.chooseOption}
        value={draft.errorType as string}
      />
      <div className="lesson-field">
        <label htmlFor={`${idPrefix}-line`}>{copy.text.diagnoseLine}</label>
        <input
          className="field-control number-input"
          disabled={disabled}
          id={`${idPrefix}-line`}
          inputMode="numeric"
          min={1}
          onChange={(event) => onChange({ ...draft, line: event.target.value })}
          type="number"
          value={draft.line as string}
        />
      </div>
      <fieldset className="lesson-fieldset">
        <legend>{copy.text.diagnoseCause}</legend>
        <ChoiceList
          context={context}
          disabled={disabled}
          idPrefix={idPrefix}
          multi={false}
          name="cause"
          onSelect={([cause]) => onChange({ ...draft, cause: cause ?? '' })}
          options={exercise.cause_options}
          selected={draft.cause ? [draft.cause as string] : []}
          seed={`${seed}|cause`}
        />
      </fieldset>
    </>
  );
}

function ProgramWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'program'>) {
  return (
    <>
      {exercise.how ? (
        <p>
          <em>{copy.text.howPrefix}</em>{' '}
          <InlineText context={context} text={exercise.how} />
        </p>
      ) : null}
      {exercise.examples.length > 0 && exercise.reads_input ? (
        <>
          <p>
            {formatCopy(copy, 'programExamples', {
              compare:
                exercise.compare === 'last_line'
                  ? copy.text.compareLastLine
                  : copy.text.compareAll,
            })}
          </p>
          {exercise.examples.map((example, index) => (
            <CodeView
              code={example.expected_transcript}
              context={context}
              key={index}
            />
          ))}
        </>
      ) : null}
      {exercise.broken_run ? (
        <>
          <p>
            {exercise.broken_run.failed
              ? copy.text.programToFix
              : copy.text.programToChange}
          </p>
          <CodeView code={exercise.starter} context={context} />
          <p>
            {exercise.broken_run.stdin
              ? formatCopy(copy, 'programRunWithInput', {
                  stdin: exercise.broken_run.stdin
                    .replace(/\n$/, '')
                    .replace(/\n/g, ' ↵ '),
                })
              : copy.text.programRun}
          </p>
          <CodeView code={exercise.broken_run.terminal} context={context} />
        </>
      ) : exercise.starter ? (
        <CodeView code={exercise.starter} context={context} />
      ) : null}
      <TextAnswer
        disabled={disabled}
        id={`${idPrefix}-source`}
        label={copy.text.answerLabel}
        monospace
        onChange={(source) => onChange({ source })}
        rows={10}
        value={draft.source as string}
      />
    </>
  );
}

function TestTableWidget({
  copy,
  disabled,
  draft,
  exercise,
  onChange,
}: WidgetProps<'testtable'>) {
  const surfaces = useLessonSurfaces();
  const rows = draft.rows as Array<{ inputs: string[]; expected: string }>;
  const update = (next: typeof rows) => onChange({ rows: next });

  return (
    <>
      <p>
        {formatCopy(copy, 'testtableHow', {
          fields: exercise.fields.join(' | '),
          minRows: exercise.min_rows,
          coverage: exercise.coverage.map((rule) => rule.name).join(', '),
        })}
      </p>
      <div className="lesson-table">
        <table className="insights-table">
          <thead>
            <tr>
              {exercise.fields.map((field) => (
                <th key={field} scope="col">
                  {field}
                </th>
              ))}
              <th scope="col">{copy.text.expectedOutputColumn}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {exercise.fields.map((field, column) => (
                  <td key={field}>
                    <input
                      aria-label={`${formatCopy(copy, 'rowLabel', { n: rowIndex + 1 })}: ${field}`}
                      className="field-control lesson-mono"
                      disabled={disabled}
                      onChange={(event) =>
                        update(
                          rows.map((entry, index) =>
                            index === rowIndex
                              ? {
                                  ...entry,
                                  inputs: entry.inputs.map(
                                    (value, inputIndex) =>
                                      inputIndex === column
                                        ? event.target.value
                                        : value,
                                  ),
                                }
                              : entry,
                          ),
                        )
                      }
                      value={row.inputs[column] ?? ''}
                    />
                  </td>
                ))}
                <td>
                  <input
                    aria-label={`${formatCopy(copy, 'rowLabel', { n: rowIndex + 1 })}: ${copy.text.expectedOutputColumn}`}
                    className="field-control lesson-mono"
                    disabled={disabled}
                    onChange={(event) =>
                      update(
                        rows.map((entry, index) =>
                          index === rowIndex
                            ? { ...entry, expected: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    value={row.expected}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="action-row">
        <button
          className={surfaces.secondary}
          disabled={disabled}
          onClick={() =>
            update([
              ...rows,
              { inputs: exercise.fields.map(() => ''), expected: '' },
            ])
          }
          type="button"
        >
          {copy.text.addRow}
        </button>
        {rows.length > 1 ? (
          <button
            className={surfaces.quiet}
            disabled={disabled}
            onClick={() => update(rows.slice(0, -1))}
            type="button"
          >
            {formatCopy(copy, 'removeRow', { n: rows.length })}
          </button>
        ) : null}
      </div>
    </>
  );
}

function EvidenceWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'evidence'>) {
  return (
    <>
      {exercise.how ? (
        <p>
          <em>{copy.text.howPrefix}</em>{' '}
          <InlineText context={context} text={exercise.how} />
        </p>
      ) : null}
      <p className="lesson-note">{copy.text.selfReported}</p>
      <p className="lesson-note">{copy.text.privacy}</p>
      <TextAnswer
        disabled={disabled}
        id={`${idPrefix}-text`}
        label={copy.text.answerLabel}
        monospace
        onChange={(text) => onChange({ text })}
        value={draft.text as string}
      />
    </>
  );
}

function ReflectWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'reflect'>) {
  if (exercise.choices !== null) {
    return (
      <fieldset className="lesson-fieldset">
        <legend className="sr-only">{copy.text.answerLabel}</legend>
        <div className="lesson-choices">
          {exercise.choices.map((choice, index) => {
            const id = `${idPrefix}-choice-${index}`;
            return (
              <label className="checkbox" htmlFor={id} key={choice}>
                <input
                  checked={draft.choice === choice}
                  disabled={disabled}
                  id={id}
                  name={`${idPrefix}-choice`}
                  onChange={() => onChange({ choice })}
                  type="radio"
                />
                <span>
                  <InlineText context={context} text={choice} />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <TextAnswer
      disabled={disabled}
      id={`${idPrefix}-text`}
      label={copy.text.answerLabel}
      monospace={false}
      onChange={(text) => onChange({ text })}
      value={draft.text as string}
    />
  );
}

function ChecklistWidget({
  context,
  copy,
  disabled,
  draft,
  exercise,
  idPrefix,
  onChange,
}: WidgetProps<'checklist'>) {
  const checked = draft.checked as boolean[];

  return (
    <fieldset className="lesson-fieldset">
      <legend className="sr-only">{copy.text.answerLabel}</legend>
      <div className="lesson-choices">
        {exercise.items.map((item, index) => {
          const id = `${idPrefix}-check-${index}`;
          return (
            <label className="checkbox" htmlFor={id} key={index}>
              <input
                checked={checked[index] ?? false}
                disabled={disabled}
                id={id}
                onChange={(event) => {
                  const next = [...checked];
                  next[index] = event.target.checked;
                  onChange({ checked: next });
                }}
                type="checkbox"
              />
              <span>
                <InlineText context={context} text={item} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AnswerWidget(props: WidgetProps<LessonExercise['type']>) {
  const { exercise } = props;

  switch (exercise.type) {
    case 'mcq':
      return <McqWidget {...(props as WidgetProps<'mcq'>)} />;
    case 'sort':
      return <SortWidget {...(props as WidgetProps<'sort'>)} />;
    case 'assemble':
      return <AssembleWidget {...(props as WidgetProps<'assemble'>)} />;
    case 'fill':
      return <FillWidget {...(props as WidgetProps<'fill'>)} />;
    case 'predict':
      return <PredictWidget {...(props as WidgetProps<'predict'>)} />;
    case 'trace':
      return <TraceWidget {...(props as WidgetProps<'trace'>)} />;
    case 'cmd':
      return <CmdWidget {...(props as WidgetProps<'cmd'>)} />;
    case 'diagnose':
      return <DiagnoseWidget {...(props as WidgetProps<'diagnose'>)} />;
    case 'program':
      return <ProgramWidget {...(props as WidgetProps<'program'>)} />;
    case 'testtable':
      return <TestTableWidget {...(props as WidgetProps<'testtable'>)} />;
    case 'evidence':
      return <EvidenceWidget {...(props as WidgetProps<'evidence'>)} />;
    case 'reflect':
      return <ReflectWidget {...(props as WidgetProps<'reflect'>)} />;
    case 'checklist':
      return <ChecklistWidget {...(props as WidgetProps<'checklist'>)} />;
  }
}

export { CodeView };
