import { FileCheckType, type FileFixFunction } from 'declapract';

// a hand-written Config.ts is the bad practice; config.schema.ts infers Config (#661)
export const check = FileCheckType.EXISTS;

/**
 * .what = delete the hand-written Config.ts
 * .why  = it has no reader once getConfig types off config.schema.ts, so it can only drift
 */
export const fix: FileFixFunction = () => ({ contents: null });
