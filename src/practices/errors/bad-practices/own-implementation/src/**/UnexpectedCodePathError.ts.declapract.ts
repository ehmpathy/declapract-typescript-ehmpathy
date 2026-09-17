import { FileCheckType } from 'declapract';

// the declaration path is a catch-all glob (`src/**/UnexpectedCodePathError.ts`), not the
// literal `src/utils/errors/UnexpectedCodePathError.ts`. a consumer's own implementation one
// directory segment away (e.g. `src/domain/errors/UnexpectedCodePathError.ts`) must still be
// caught — a literal path silently passes the miss-by-one-segment case, so the own-implementation
// bad practice would never fire for it.
export const check = FileCheckType.EXISTS;
