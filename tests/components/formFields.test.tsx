import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormField } from '@/components/ui/FormField';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';

describe('FormField', () => {
  it('wires labels and descriptions to text-based inputs', () => {
    render(
      <>
        <FormField
          controlId="display-name"
          description="Visible only on this device."
          label="Display name"
        >
          {({ describedBy, inputId, invalid }) => (
            <TextInput
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              id={inputId}
            />
          )}
        </FormField>
        <FormField
          controlId="course-track"
          description="Used for local seed selection."
          label="Course track"
        >
          {({ describedBy, inputId, invalid }) => (
            <Select
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              id={inputId}
              options={[
                { label: 'CS50x 2026', value: 'cs50x-2026' },
                { label: 'CS50x local copy', value: 'cs50x-custom' },
              ]}
            />
          )}
        </FormField>
        <FormField
          controlId="study-notes"
          description="Keep notes plain and visible."
          label="Study notes"
        >
          {({ describedBy, inputId, invalid }) => (
            <TextArea
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              id={inputId}
            />
          )}
        </FormField>
      </>,
    );

    expect(screen.getByLabelText('Display name')).toHaveAttribute(
      'aria-describedby',
      'display-name-description',
    );
    expect(screen.getByLabelText('Course track')).toHaveAttribute(
      'aria-describedby',
      'course-track-description',
    );
    expect(screen.getByLabelText('Study notes')).toHaveAttribute(
      'aria-describedby',
      'study-notes-description',
    );
  });

  it('marks invalid controls accessibly', () => {
    render(
      <FormField
        controlId="target-minutes"
        description="Use practical weekly targets."
        error="Enter at least 30 minutes."
        label="Target minutes"
      >
        {({ describedBy, inputId, invalid }) => (
          <NumberInput
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            id={inputId}
          />
        )}
      </FormField>,
    );

    expect(screen.getByLabelText('Target minutes')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Enter at least 30 minutes.')).toBeInTheDocument();
  });
});
