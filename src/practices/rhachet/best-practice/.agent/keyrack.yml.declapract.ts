import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

/**
 * .what = the practices whose presence means the repo reaches aws with local credentials
 * .why  = such a repo needs AWS_PROFILE on a laptop (#487); a repo with none of them needs no
 *         aws key at all, so the findsert stays out of its keyrack.yml
 */
const AWS_PRACTICES: readonly string[] = [
  'environments-aws',
  'node-service',
  'persist-with-dynamodb',
  'persist-with-rds',
  'serverless',
  'terraform-aws',
];

/**
 * .what = the AWS_PROFILE entry this practice declares, in the is-optional-if-has shape (#491)
 * .why  = a laptop sets AWS_PROFILE; ci sets AWS_ACCESS_KEY_ID via oidc. the key is optional when
 *         the alternative is present, so `keyrack.source({ mode: strict })` passes in ci too
 */
const declaredAwsProfileEntry = {
  key: 'AWS_PROFILE',
  'is-optional-if-has': 'AWS_ACCESS_KEY_ID',
};

/**
 * .what = whether a keyrack env seq item names AWS_PROFILE, as a bare string or a `key:` map
 */
const isAwsProfileItem = (item: unknown): boolean => {
  if (yaml.isScalar(item)) return item.value === 'AWS_PROFILE';
  if (yaml.isMap(item)) return item.get('key') === 'AWS_PROFILE';
  return false;
};

/**
 * .what = the `env.*` seq nodes a keyrack.yml declares (env.all, env.test, env.prep, env.prod)
 */
const getEnvSeqs = (doc: yaml.Document): yaml.YAMLSeq[] => {
  if (!yaml.isMap(doc.contents)) return [];
  return doc.contents.items
    .filter(
      (pair) =>
        yaml.isScalar(pair.key) &&
        String(pair.key.value).startsWith('env.') &&
        yaml.isSeq(pair.value),
    )
    .map((pair) => pair.value as yaml.YAMLSeq);
};

/**
 * .what = the keyrack.yml a repo should hold, given its extant one and its practices
 * .why  = a FINDSERT, scope-safe (rule.avoid.runtime-forks): it only adds or upgrades the
 *         AWS_PROFILE entry, never removes a line, so a narrow-scope apply (where the aws signal
 *         goes dark) leaves a correct file intact
 *         - no aws practice → the file as it stands
 *         - a bare `AWS_PROFILE` under any env.* section → upgraded in place to is-optional-if-has
 *         - AWS_PROFILE absent from every env.* section → added under env.all
 *         - AWS_PROFILE already a `key:` map → kept as the adopter shaped it
 * .note = a fixed point: a conformant file is returned verbatim, so fix(fix(x)) === fix(x)
 */
const defineExpectedKeyrackContents = (input: {
  contents: string;
  projectPractices: string[];
}): string => {
  // a repo with no aws practice: no aws key is owed
  const isAws = input.projectPractices.some((practice) =>
    AWS_PRACTICES.includes(practice),
  );
  if (!isAws) return input.contents;

  // find each AWS_PROFILE entry the repo declares
  const doc = yaml.parseDocument(input.contents);
  const envSeqs = getEnvSeqs(doc);
  const bareEntries = envSeqs.flatMap((seq) =>
    seq.items
      .map((item, index) => ({ seq, item, index }))
      .filter(({ item }) => yaml.isScalar(item) && isAwsProfileItem(item)),
  );
  const hasAnyEntry = envSeqs.some((seq) => seq.items.some(isAwsProfileItem));

  // already conformant → the file verbatim (no round-trip)
  if (hasAnyEntry && bareEntries.length === 0) return input.contents;

  // upgrade each bare entry in place, so its env section and its comment stay put
  // .note = deliberate mutation — the yaml document api mutates nodes in place to keep comments
  bareEntries.forEach(({ seq, item, index }) => {
    const upgraded = doc.createNode(declaredAwsProfileEntry);
    upgraded.commentBefore = (item as yaml.Scalar).commentBefore;
    seq.items[index] = upgraded;
  });
  if (hasAnyEntry) return doc.toString();

  // absent: add under env.all (seed the seq where env.all is null or absent)
  const envAll = doc.get('env.all');
  if (!yaml.isSeq(envAll)) {
    doc.set('env.all', doc.createNode([declaredAwsProfileEntry]));
    return doc.toString();
  }
  envAll.add(doc.createNode(declaredAwsProfileEntry));
  return doc.toString();
};

/**
 * .what = throws when the repo lacks a keyrack.yml, or an aws repo lacks the AWS_PROFILE entry
 * .note = best-practice semantics: a THROW means violated (declapract-check-semantics.md)
 */
export const check: FileCheckFunction = (contents, context) => {
  // the file must exist (rhachet init --keys writes it)
  if (contents === null)
    throw new ConstraintError('.agent/keyrack.yml is absent', {
      hint: 'run `npx rhachet init --keys` to create it',
    });

  // an aws repo must carry AWS_PROFILE in the is-optional-if-has shape
  const expected = defineExpectedKeyrackContents({
    contents,
    projectPractices: context.projectPractices,
  });
  if (contents !== expected)
    throw new ConstraintError(
      '.agent/keyrack.yml lacks AWS_PROFILE (is-optional-if-has AWS_ACCESS_KEY_ID) for an aws repo',
      { relativeFilePath: context.relativeFilePath },
    );
};

/**
 * .what = findserts the AWS_PROFILE entry into an aws repo's keyrack.yml (#491, #487)
 * .note = an absent file is left to `rhachet init --keys` (it knows the org); the fix returns no
 *         contents for it, which declapract reads as "no automatic fix"
 */
export const fix: FileFixFunction = (contents, context) => {
  if (contents === null) return {};
  return {
    contents: defineExpectedKeyrackContents({
      contents,
      projectPractices: context.projectPractices,
    }),
  };
};
