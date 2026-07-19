// Types for the AI helper module. Runtime is plain JS (PocketBase JSVM); these
// let the frontend test suite import merchantTokens to guard the tokenization.

/** Merchant tokens from a description, strongest (longest) first. */
export function merchantTokens(desc: string): string[]

/** Generic banking noise words filtered out of merchant tokens. */
export const NOISE: Record<string, number>
