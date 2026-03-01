/**
 * SaaS feature implementations
 *
 * This barrel file signals to next.config.ts that the SaaS src/ layer exists.
 * When detected, the @saas webpack alias points here instead of src/features/.
 */
export const isSaas = true;
