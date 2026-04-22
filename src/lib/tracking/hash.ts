import { createHash } from 'node:crypto';

export function sha256Lower(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return createHash('sha256').update(normalised).digest('hex');
}
