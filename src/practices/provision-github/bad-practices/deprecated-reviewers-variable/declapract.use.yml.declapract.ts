import type { FileCheckFunction, FileFixFunction } from 'declapract';
import yaml from 'yaml';

/**
 * .what = removes deprecated reviewers.users variable from declapract.use.yml
 * .why = production-on-else environment now uses team:releaser instead of user list
 */

export const check: FileCheckFunction = (contents) => {
  if (!contents) throw new Error('no file found');

  const parsed = yaml.parse(contents) as {
    variables?: Record<string, unknown>;
  };
  const variables = parsed?.variables ?? {};

  // check if reviewers or reviewers.users exists
  if ('reviewers' in variables) return; // bad practice detected

  throw new Error('no deprecated reviewers variable found');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  // parse with parseDocument to preserve comments and format
  const doc = yaml.parseDocument(contents);
  const parsed = doc.toJSON() as { variables?: Record<string, unknown> };

  if (!parsed?.variables || !('reviewers' in parsed.variables)) {
    return { contents };
  }

  // remove the reviewers key from variables
  const variablesNode = doc.get('variables') as yaml.YAMLMap | undefined;
  if (variablesNode) {
    variablesNode.delete('reviewers');
  }

  return { contents: doc.toString() };
};
