import { FileCheckType, type FileFixFunction } from 'declapract';

/**
 * .what = validates publish.yml matches the template exactly
 * .why = secrets: inherit passes all secrets to .test.yml; firewall handles key filter at runtime
 */
export const check = FileCheckType.EQUALS;

/**
 * .what = replaces publish.yml with the template content
 * .why = ensures caller workflow has secrets: inherit for firewall
 */
export const fix: FileFixFunction = async (_contents, context) => {
  return { contents: context.declaredFileContents ?? '' };
};
