/**
 * Split a raw symptom input into individual symptom names.
 * Supports common Chinese punctuation marks and standard commas/semicolons.
 */
export function parseSymptomNames(input: string): string[] {
  return input
    .split(/[，,、;；\n\r]+/)
    .map(name => name.trim())
    .filter(Boolean)
}

