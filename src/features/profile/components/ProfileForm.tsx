import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { type SaveLearnerProfileInput } from '@/lib/db';
import type { LearnerAvatarId, LearnerProfile, StudyDay } from '@/lib/domain';

import { avatarOptions } from '@/features/profile/avatars';
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
  persistedAvatarId: LearnerAvatarId | undefined,
): SaveLearnerProfileInput {
  // A profile with no explicit avatar selection stays that way until the
  // learner picks a non-original avatar; saving other settings must not
  // turn "unset" into a stored choice.
  const { avatarId, ...legacyAvatarFields } = createAvatarConfig(values);
  const keepAvatarId =
    persistedAvatarId !== undefined || avatarId !== 'original';

  return {
    avatarConfig: keepAvatarId
      ? { avatarId, ...legacyAvatarFields }
      : legacyAvatarFields,
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
        toProfileInput(
          nextValues,
          validation.parsedTargetMinutesPerWeek,
          profile?.avatarConfig?.avatarId,
        ),
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
          description="Choose one of the bundled ProgressPal characters. Profile preferences stay local to this device."
          title="Avatar and preferences"
          titleAs={cardTitleAs}
        >
          <fieldset className="profile-fieldset">
            <legend className="profile-fieldset__legend">Avatar</legend>
            <p className="profile-fieldset__description">
              The same character is used in Classic and RPG views.
            </p>
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
              }}
            >
              {avatarOptions.map((option) => (
                <label
                  key={option.id}
                  style={{
                    alignItems: 'center',
                    border:
                      '1px solid color-mix(in srgb, currentColor 22%, transparent)',
                    borderRadius: '0.75rem',
                    cursor: disabled ? 'default' : 'pointer',
                    display: 'flex',
                    gap: '0.625rem',
                    opacity: disabled ? 0.65 : 1,
                    padding: '0.625rem',
                  }}
                >
                  <input
                    checked={values.avatarId === option.id}
                    disabled={disabled}
                    name={`${fieldPrefix}-avatar`}
                    onChange={() =>
                      setValues((currentValues) => ({
                        ...currentValues,
                        avatarId: option.id,
                      }))
                    }
                    type="radio"
                    value={option.id}
                  />
                  <ProfileAvatar
                    avatarConfig={{
                      ...createAvatarConfig(values),
                      avatarId: option.id,
                    }}
                    label={`${option.label} avatar`}
                    size="sm"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="profile-preview-card">
            <ProfileAvatar
              avatarConfig={createAvatarConfig(values)}
              label="Avatar preview"
            />
            <dl className="profile-summary-list">
              <div>
                <dt>Theme</dt>
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
                mode === 'onboarding'
                  ? 'System follows the device preference. Light and dark stay local to this app.'
                  : 'Applies to both the Classic and RPG interfaces. System follows your device. Light and dark stay local to this app.'
              }
              label="Theme"
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
