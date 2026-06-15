import { z } from 'zod';

export class SchemaValidationError extends Error {
  readonly issues: string[];

  constructor(label: string, issues: string[]) {
    super(`${label} validation failed: ${issues.join('; ')}`);
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? 'root' : issue.path.join('.');

    return `${path}: ${issue.message}`;
  });
}

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
  label: string,
): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw new SchemaValidationError(label, formatZodIssues(result.error));
}
