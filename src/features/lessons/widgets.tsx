import type { ReactNode } from 'react';

import type {
  LessonExercise,
  LessonExerciseOf,
  LessonUiCopy,
} from '@/lib/domain';

import type { AnswerDraft } from './drafts';
import { InlineText, Markup, type MarkupContext } from './markup';
import { formatCopy, shuffledOrder } from './model';
import { useLessonSurfaces } from './presentation';

/**
 * Answer widgets, one per authored response mode (DC-09 to DC-13). Every
 * control is a native, labelled form control: nothing is drag-only (sorting
 * and ordering use the authored keyboard alternative, numbered selects),
 * choices are shuffled at delivery and evaluated by option ID (DC-10), and
 * structured items keep partial progress while editing (DC-13). Widgets
 * never show answer keys, evaluator wording or hidden variants.
 */

type WidgetProps<Type extends LessonExercise['type']> = {
  readonly context: MarkupContext;
  readonly copy: LessonUiCopy;
  readonly disabled: boolean;
  readonly draft: AnswerDraft;
  readonly exercise: LessonExerciseOf<Type>;
  readonly idPrefix: string;
  readonly onChange: (draft: AnswerDraft) => void;
  readonly seed: string;
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
      <pre lang={context.technicalLanguage}>
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
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  id: string;
  label: ReactNode;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
    const positions = draft.positions as number[];

    return (
      <div className="lesson-fieldset">
        <p>{copy.text.orderInstruction}</p>
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
              const next = [...positions];
              next[itemIndex] = Number(value) || 0;
              onChange({ positions: next });
            }}
            options={exercise.items.map((_, position) => ({
              label: `${copy.text.positionLabel} ${position + 1}`,
              value: String(position + 1),
            }))}
            placeholder={copy.text.chooseOption}
            value={positions[itemIndex] ? String(positions[itemIndex]) : ''}
          />
        ))}
      </div>
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
          onChange={(value) => {
            const next = [...matches];
            next[itemIndex] = value;
            onChange({ matches: next });
          }}
          options={rightOrder.map((index) => ({
            label: rights[index]!,
            value: rights[index]!,
          }))}
          placeholder={copy.text.chooseOption}
          value={matches[itemIndex] ?? ''}
        />
      ))}
    </div>
  );
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
      <pre lang={context.technicalLanguage}>
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
