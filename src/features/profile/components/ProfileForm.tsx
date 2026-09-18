import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { type SaveLearnerProfileInput } from '@/lib/db';
import type { LearnerProfile, StudyDay } from '@/lib/domain';

import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import {
  createAvatarConfig,
  createProfileFormValues,
  studyDayOptions,
  themeOptions,
  type ProfileFormValues,
} from '@/features/profile/model';

type ProfileFormMode = 'onboarding' | 'settings';

type ProfileFormProps = {
  cardTitleAs?: 'h2' | 'h3';
  disabled?: boolean;
  mode: ProfileFormMode;
  onSubmit: (input: SaveLearnerProfileInput) => Promise<void>;
  profile: LearnerProfile | null;
  submitLabel: string;
  variant?: 'classic' | 'rpg';
};

type ProfileFormErrors = Partial<
  Record<
    'displayName' | 'submit' | 'targetMinutesPerWeek' | 'targetStudyDays',
    string
  >
>;

function normalizeStudyDays(days: readonly StudyDay[]) {
  return studyDayOptions
    .filter((option) => days.includes(option.value))
    .map((option) => option.value);
}

function validateProfileForm(values: ProfileFormValues): {
  errors: ProfileFormErrors;
  parsedTargetMinutesPerWeek: number | null;
} {
  const errors: ProfileFormErrors = {};
  const trimmedName = values.displayName.trim();
  const parsedTargetMinutesPerWeek = Number.parseInt(
    values.targetMinutesPerWeek,
    10,
  );

  if (trimmedName.length === 0) {
    errors.displayName = 'Enter a display name.';
  } else if (trimmedName.length > 80) {
    errors.displayName = 'Display name must be 80 characters or fewer.';
  }

  if (values.targetStudyDays.length === 0) {
    errors.targetStudyDays = 'Choose at least one study day.';
  }

  if (
    !Number.isInteger(parsedTargetMinutesPerWeek) ||
    parsedTargetMinutesPerWeek < 30 ||
    parsedTargetMinutesPerWeek > 10_080
  ) {
    errors.targetMinutesPerWeek =
      'Enter a weekly target between 30 and 10,080 minutes.';
  }

  return {
    errors,
    parsedTargetMinutesPerWeek: Number.isInteger(parsedTargetMinutesPerWeek)
      ? parsedTargetMinutesPerWeek
      : null,
  };
}

function toProfileInput(
  values: ProfileFormValues,
  parsedTargetMinutesPerWeek: number,
): SaveLearnerProfileInput {
  return {
    avatarConfig: createAvatarConfig(values),
    displayName: values.displayName.trim(),
    preferredTheme: values.preferredTheme,
    reducedMotion: values.reducedMotion,
    targetMinutesPerWeek: parsedTargetMinutesPerWeek,
    targetStudyDays: normalizeStudyDays(values.targetStudyDays),
  };
}

export function ProfileForm({
  cardTitleAs = 'h3',
  disabled = false,
  mode,
  onSubmit,
  profile,
  submitLabel,
  variant = 'classic',
}: ProfileFormProps) {
  const fieldPrefix = `profile-${mode}`;
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState(() => createProfileFormValues(profile));

  async function submitValues(nextValues: ProfileFormValues) {
    const validation = validateProfileForm(nextValues);

    if (
      validation.parsedTargetMinutesPerWeek === null ||
      Object.keys(validation.errors).length > 0
    ) {
      setErrors(validation.errors);

      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(
        toProfileInput(nextValues, validation.parsedTargetMinutesPerWeek),
      );
    } catch (submitError) {
      setErrors({
        submit:
          submitError instanceof Error
            ? submitError.message
            : 'Profile could not be saved.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    await submitValues(values);
  }

  return (
    <form className="profile-form" noValidate onSubmit={handleSubmit}>
      <div className="profile-page-grid">
        <Card
          description="Everything here stays on this device. You can revise it later in settings."
          title={mode === 'onboarding' ? 'Profile setup' : 'Edit profile'}
          titleAs={cardTitleAs}
        >
          <div className="form-grid">
            <FormField
              controlId={`${fieldPrefix}-display-name`}
              description="The name shown in ProgressPal on this device."
              error={errors.displayName}
              label="Display name"
              required
            >
              {({ describedBy, inputId, invalid }) => (
                <TextInput
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  maxLength={80}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Learner"
                  value={values.displayName}
                />
              )}
            </FormField>
            <FormField
              controlId={`${fieldPrefix}-target-minutes`}
              description="Keep the weekly target practical enough to survive low-energy weeks."
              error={errors.targetMinutesPerWeek}
              label="Target minutes per week"
              required
            >
              {({ describedBy, inputId, invalid }) => (
                <NumberInput
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  min={30}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      targetMinutesPerWeek: event.target.value,
                    }))
                  }
                  step={15}
                  value={values.targetMinutesPerWeek}
                />
              )}
            </FormField>
          </div>
          <fieldset
            aria-describedby={`${fieldPrefix}-study-days-description ${errors.targetStudyDays ? `${fieldPrefix}-study-days-error` : ''}`.trim()}
            className="profile-fieldset"
          >
            <legend className="profile-fieldset__legend">Study days</legend>
            <p
              className="profile-fieldset__description"
              id={`${fieldPrefix}-study-days-description`}
            >
              Pick the days you realistically expect to show up.
            </p>
            <div className="checkbox-grid">
              {studyDayOptions.map((option) => (
                <Checkbox
                  checked={values.targetStudyDays.includes(option.value)}
                  id={`${fieldPrefix}-${option.value}`}
                  key={option.value}
                  label={option.label}
                  onChange={(event) => {
                    const nextStudyDays = event.target.checked
                      ? [...values.targetStudyDays, option.value]
                      : values.targetStudyDays.filter(
                          (day) => day !== option.value,
                        );

                    setValues((currentValues) => ({
                      ...currentValues,
                      targetStudyDays: normalizeStudyDays(nextStudyDays),
                    }));
                  }}
                />
              ))}
            </div>
            {errors.targetStudyDays ? (
              <p
                className="form-field__error"
                id={`${fieldPrefix}-study-days-error`}
              >
                {errors.targetStudyDays}
              </p>
            ) : null}
          </fieldset>
        </Card>
        <Card
          description="The fixed character image is bundled with the app. Profile preferences stay local to this device."
          title="Avatar and preferences"
          titleAs={cardTitleAs}
        >
          <div className="profile-preview-card">
            <ProfileAvatar
              avatarConfig={createAvatarConfig(values)}
              label="Avatar preview"
            />
            <dl className="profile-summary-list">
              <div>
                <dt>{variant === 'rpg' ? 'Tracker theme' : 'Theme'}</dt>
                <dd>{values.preferredTheme}</dd>
              </div>
              <div>
                <dt>Motion</dt>
                <dd>{values.reducedMotion ? 'Reduced' : 'Standard'}</dd>
              </div>
            </dl>
          </div>
          <div className="form-grid">
            <FormField
              controlId={`${fieldPrefix}-theme`}
              description={
                variant === 'rpg'
                  ? 'Applies to Tracker pages. RPG keeps its dark study theme. System follows your device.'
                  : 'System follows the device preference. Light and dark stay local to this app.'
              }
              label={variant === 'rpg' ? 'Tracker theme' : 'Theme'}
              required
            >
              {({ describedBy, inputId, invalid }) => (
                <Select
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  id={inputId}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      preferredTheme: event.target
                        .value as ProfileFormValues['preferredTheme'],
                    }))
                  }
                  options={themeOptions}
                  value={values.preferredTheme}
                />
              )}
            </FormField>
          </div>
          <Checkbox
            checked={values.reducedMotion}
            description="Suppress extra transitions even if the device preference does not request it."
            id={`${fieldPrefix}-reduced-motion`}
            label="Reduce motion in this app"
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                reducedMotion: event.target.checked,
              }))
            }
          />
        </Card>
      </div>
      {errors.submit ? (
        <p className="form-field__error" role="alert">
          {errors.submit}
        </p>
      ) : null}
      <div className="profile-form__actions">
        <Button
          disabled={disabled}
          loading={isSubmitting}
          size="lg"
          type="submit"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
