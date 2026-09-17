import { FileCheckType, type FileFixFunction } from 'declapract';
import { MalfunctionError } from 'helpful-errors';

/**
 * .what = validates .test.yml matches the template exactly
 * .why = keyrack firewall handles secrets at runtime; no build-time injection needed
 */
export const check = FileCheckType.EQUALS;

/**
 * .what = replaces .test.yml with the template content
 * .why = ensures workflow has firewall step for keyrack secrets
 * .note = fail-fast on absent declared contents. a declared file ALWAYS has content — declapract
 *         reads the template beside this declaration. so a null/undefined `declaredFileContents`
 *         is an internal invariant violation (a build wired wrong), never a valid state; a `?? ''`
 *         would swallow it and write a ZERO-BYTE workflow to a consumer — a silent break the wish
 *         forbids. throw loud so the misconfigured build surfaces, rather than ship an empty file.
 */
export const fix: FileFixFunction = async (_contents, context) => {
  if (context.declaredFileContents === null || context.declaredFileContents === undefined)
    throw new MalfunctionError(
      'no declaredFileContents for .test.yml — declapract could not read the template beside its declaration',
      { relativeFilePath: '.github/workflows/.test.yml' },
    );
  return { contents: context.declaredFileContents };
};
