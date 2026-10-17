// eslint-disable-next-line import/no-extraneous-dependencies
import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

/**
 * .what = whether one exclude entry would hide node_modules from dpdm
 * .why  = node_modules in scope IS the policy (`rule.forbid.dpdm-exclude-change`); an entry that
 *         names it disables the cycle check across the whole dependency tree
 */
const isNodeModulesEntry = (input: { entry: unknown }): boolean =>
  String(input.entry).includes('node_modules');

/**
 * .what = the `.dpdmrc.yaml` policy holds: `exclude` is a list, and no entry names node_modules
 * .why  = the file was EQUALS, so every apply deleted the cited devDep entries the policy itself
 *         allows (#628). this check passes any policy-valid list, so an adopter's entry survives.
 * .note = best-practice semantics: throw = violated, return = followed
 */
export const check: FileCheckFunction = (contents, context) => {
  if (!contents)
    throw new ConstraintError('.dpdmrc.yaml is absent', {
      relativeFilePath: context.relativeFilePath,
    });
  const exclude: unknown = yaml.parse(contents)?.exclude;
  if (!Array.isArray(exclude))
    throw new ConstraintError('.dpdmrc.yaml `exclude` is not a list', {
      exclude,
    });
  const offenders = exclude.filter((entry) => isNodeModulesEntry({ entry }));
  if (offenders.length)
    throw new ConstraintError(
      '.dpdmrc.yaml `exclude` names node_modules, which disables the cycle check on dependencies',
      { offenders },
    );
};

/**
 * .what = write the declared file when absent; otherwise repair only the policy breach
 * .why  = a check with no usable fix makes declapract mark the whole file manual (#607), so the
 *         fix must turn every red the check can raise into green: it seeds `exclude: []` when the
 *         key is absent or not a list, and drops only the node_modules entries. the adopter's other
 *         entries and comments survive.
 * .note = a fixed point: on a policy-valid file it returns the contents unchanged
 */
export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents: context.declaredFileContents };

  // parse with comments kept
  const doc = yaml.parseDocument(contents);

  // a root that does not parse, or is not a map, holds no policy to keep; write the declared file
  if (doc.errors.length || (doc.contents !== null && !yaml.isMap(doc.contents)))
    return { contents: context.declaredFileContents };
  const exclude: unknown = doc.toJSON()?.exclude;

  // seed an empty list when the key is absent or not a list
  if (!Array.isArray(exclude)) {
    doc.set('exclude', doc.createNode([]));
    return { contents: doc.toString() };
  }

  // drop only the node_modules entries from the repo's own list, judged by each item's resolved value (an alias or a
  // non-scalar resolves exactly as the check reads it), aligned to the seq by index
  if (!exclude.some((entry) => isNodeModulesEntry({ entry })))
    return { contents };
  const seq = doc.get('exclude');

  // an alias to a list holds no items in place; set the kept values as a fresh list
  if (!yaml.isSeq(seq)) {
    doc.set(
      'exclude',
      doc.createNode(exclude.filter((entry) => !isNodeModulesEntry({ entry }))),
    );
    return { contents: doc.toString() };
  }
  seq.items = seq.items.filter(
    (_item, index) => !isNodeModulesEntry({ entry: exclude[index] }),
  ); // .note = deliberate mutation — the yaml document api keeps comments only in place
  return { contents: doc.toString() };
};
