/**
 * Bidirectional-text isolation for numbers rendered inside Arabic text.
 *
 * A signed figure like "-2.55%" is, to the Unicode bidi algorithm, a neutral
 * sign followed by European digits followed by another neutral. Inside an RTL
 * paragraph the leading sign is resolved to the paragraph direction and lands
 * on the VISUAL RIGHT, so "-2.55%" is displayed as "2.55%-" — the minus reads
 * as if it belonged to whatever follows. On a financial page that is not a
 * cosmetic problem: the sign is the most important character in the string.
 *
 * dir="ltr" on the containing element fixes the markup case, but not a number
 * interpolated into a translated SENTENCE, where there is no element to hang
 * it on. U+2066 LEFT-TO-RIGHT ISOLATE ... U+2069 POP DIRECTIONAL ISOLATE fixes
 * both: it forces the run to lay out LTR and isolates it from its neighbours,
 * and it is inert in an LTR context, so the same string is correct in English.
 */
const LRI = '⁦';
const PDI = '⁩';

/** Isolate a numeric run so its sign stays on the left in Arabic. */
export const ltrNum = (s: string): string => `${LRI}${s}${PDI}`;
