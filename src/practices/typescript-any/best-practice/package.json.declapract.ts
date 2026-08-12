import { FileCheckType } from 'declapract';

/**
 * .what = the runtime-agnostic half of the typescript triad: the `typescript` dep
 *         + the `tsc --noEmit` typecheck command
 * .why  = the typecheck emits no output, so it is bound to no bundler and runs on any
 *         runtime. the tsconfig.json it points at is supplied by the runtime half
 *         (typescript-node or typescript-expo), so this practice pairs with exactly
 *         one of them per usecase.
 */
export const check = FileCheckType.CONTAINS;
