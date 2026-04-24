import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = validates .test.yml matches the template exactly
 * .why = keyrack firewall handles secrets at runtime; no build-time injection needed
 */
export const check = FileCheckType.EQUALS;

/**
 * .what = replaces .test.yml with the template content
 * .why = ensures workflow has firewall step for keyrack secrets
 */
export const fix: FileFixFunction = async (_contents, context) => {
  return { contents: context.declaredFileContents ?? '' };
};
