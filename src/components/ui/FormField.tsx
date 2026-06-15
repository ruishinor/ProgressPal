import type { ReactNode } from 'react';

type FormFieldRenderProps = {
  describedBy?: string;
  inputId: string;
  invalid: boolean;
};

export type FormFieldProps = {
  children: (props: FormFieldRenderProps) => ReactNode;
  controlId: string;
  description?: string;
  error?: string;
  label: string;
  required?: boolean;
  supportingText?: string;
};

export function FormField({
  children,
  controlId,
  description,
  error,
  label,
  required = false,
  supportingText,
}: FormFieldProps) {
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <div className="form-field__label-row">
        <label className="form-field__label" htmlFor={controlId}>
          {label}
        </label>
        {required ? (
          <span className="form-field__required">Required</span>
        ) : supportingText ? (
          <span className="form-field__supporting">{supportingText}</span>
        ) : null}
      </div>
      {description ? (
        <p className="form-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {children({
        describedBy,
        inputId: controlId,
        invalid: Boolean(error),
      })}
      {error ? (
        <p className="form-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
