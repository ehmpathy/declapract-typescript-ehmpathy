import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

/**
 * .what = deletes a stale `.js` jest config file
 * .why  = the go-forward jest config is `.ts` (see .declapract.readme.md). a leftover
 *         `.js` jest config (e.g. a jsdom `jest.config.js` or a `jest.unit.config.js`)
 *         is redundant and fights the shipped `.ts` config — the dual-source hazard the
 *         app-protools-native migration must reconcile. drop the redundant `.js`; the
 *         best-practice supplies the canonical `.ts` config in the same pass.
 * .note  = `{ contents: null }` removes the file. idempotent: once gone, the EXISTS
 *          check no longer detects it, so a re-run is a no-op.
 */
export const fix: FileFixFunction = () => {
  return { contents: null };
};
