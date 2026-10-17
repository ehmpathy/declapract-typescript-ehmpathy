/**
 * .what = the one zod version every zod writer in these practices emits: the exact zod that
 *         `sdk-aws-lambda` pins (0.7.1 pins `zod@4.4.3`).
 * .why  = two zod copies in one tree make tsc reconcile two near-identical `ZodType` graphs, which
 *         exhausts the heap (#545). the joi fixer's direct pin (#654) and the runtime-schemas
 *         `pnpm.overrides.zod` (#545) must name ONE version, so both read this constant.
 * .note = bump it in step with the sdk-aws-lambda floor; a lag here re-opens the two-copy tree.
 */
export const ZOD_VERSION_PINNED = '4.4.3';
