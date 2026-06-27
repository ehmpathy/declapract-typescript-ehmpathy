import type { FileCheckFunction, FileFixFunction } from 'declapract';

/**
 * .what = detects package.json scripts with `:dev` as a segment
 * .why = standardizing on `prep` over `dev` for pre-production environment naming
 *
 * matches both `:dev` at end (deploy:dev) and `:dev:` in middle (build:dev:ios)
 */
export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('fine, does not match bad practice');
  const parsedContents = JSON.parse(contents);
  const scripts = parsedContents.scripts ?? {};

  // check if any script name contains :dev as a segment (either :dev at end or :dev: in middle)
  const devScripts = Object.keys(scripts).filter(
    (key) => key.endsWith(':dev') || key.includes(':dev:'),
  );
  if (devScripts.length > 0) return; // matches bad practice

  throw new Error('fine, no scripts with :dev segment');
};

/**
 * .what = renames scripts from `:dev` segment to `:prep` segment
 * .why = standardizing on `prep` over `dev` for pre-production environment naming
 *
 * handles both `:dev` at end (deploy:dev) and `:dev:` in middle (build:dev:ios)
 *
 * .note = only renames script NAMES, not VALUES. script values may still reference
 *         `--stage dev` for infrastructure naming (cloudformation stacks stay named
 *         `$service-dev`). the serverless package.json handles this via SLS_STAGE
 *         mapping. see brief: define.infrastructure-dev-vs-application-prep.md
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  const parsedContents = JSON.parse(contents);
  const scripts = parsedContents.scripts ?? {};

  // find scripts with :dev segment and create renamed versions
  const updatedScripts = { ...scripts };
  for (const [key, value] of Object.entries(scripts)) {
    if (key.endsWith(':dev') || key.includes(':dev:')) {
      // replace :dev: in middle and :dev at end with :prep
      const newKey = key.replace(/:dev:/g, ':prep:').replace(/:dev$/, ':prep');
      updatedScripts[newKey] = value; // add :prep version
      updatedScripts[key] = undefined; // remove :dev version
    }
  }

  return {
    contents: JSON.stringify(
      { ...parsedContents, scripts: updatedScripts },
      null,
      2,
    ),
  };
};
