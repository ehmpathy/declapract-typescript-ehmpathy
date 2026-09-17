import { FileCheckType } from 'declapract';

/**
 * .what = an EXISTS-only check on `src/utils/environment.ts`.
 * .why = the `environments` practice, not `config`, authors the real `environment.ts`. this
 *        practice only asserts the file is present. under BEST_PRACTICE purpose an EXISTS check
 *        resolves `fix: null` (see declapract's getFileCheckDeclaration), so the peer template's
 *        `as any` placeholder body is never written to a consumer — the contents are structurally
 *        unreachable. safe to leave until the tracked CONTAINS-over-real-exports cleanup lands (D55).
 */
export const check = FileCheckType.EXISTS;
