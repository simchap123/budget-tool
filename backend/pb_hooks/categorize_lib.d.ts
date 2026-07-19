// Type declarations for the auto-generated categorizer. The runtime is plain JS
// (loaded by the PocketBase JSVM), but the frontend test suite imports these to
// guard that known merchants keep landing in the right category.

/** Normalize a raw transaction description into a stable merchant key. */
export function merchantKey(description: string): string

/** Return the rule-derived category for a description, or null if none is confident. */
export function categorize(description: string): string | null

/** The compiled merchant-key -> category rule table. */
export const RULES: Record<string, string>
