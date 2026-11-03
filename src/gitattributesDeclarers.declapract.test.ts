import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { fix as fixGit } from './practices/git/best-practice/.gitattributes.declapract';
import { fix as fixDynamodb } from './practices/persist-with-dynamodb/best-practice/.gitattributes.declapract';
import { fix as fixRds } from './practices/persist-with-rds/best-practice/.gitattributes.declapract';
import { fix as fixRhachet } from './practices/rhachet/best-practice/.gitattributes.declapract';
import { fix as fixTestsAny } from './practices/tests-any/best-practice/.gitattributes.declapract';
import { declarersOrderedForGitattributes } from './utils/defineExpectedGitattributesContents';

/**
 * .what = the contents a fix emits, from its sync result
 * .why  = `FileFixFunction` types its result as sync-or-promise. the clamp folds fixes in a
 *         sync reduce, so a fix turned async must fail loud here; a read of `.contents` off a
 *         promise would yield `undefined`, and every comparison below would pass vacuously
 */
const asContents = (output: ReturnType<typeof fixGit>): string | null => {
  if (output instanceof Promise)
    throw new UnexpectedCodePathError(
      'a gitattributes fix returned a promise; the convergence clamp folds sync fixes',
    );
  if (typeof output.contents !== 'string')
    throw new UnexpectedCodePathError(
      'a gitattributes fix emitted no contents; every declarer writes the file',
      { output },
    );
  return output.contents;
};

const declarers = [
  { name: 'git', fix: fixGit },
  { name: 'tests-any', fix: fixTestsAny },
  { name: 'rhachet', fix: fixRhachet },
  { name: 'persist-with-rds', fix: fixRds },
  { name: 'persist-with-dynamodb', fix: fixDynamodb },
];

const context = {} as Parameters<typeof fixGit>[1]; // .note = the fixes read no context

const applyAll = (input: {
  contents: string | null;
  order: typeof declarers;
}): string | null =>
  input.order.reduce<string | null>(
    (contents, declarer) => asContents(declarer.fix(contents, context)),
    input.contents,
  );

const asPermutations = <T>(items: readonly T[]): T[][] =>
  items.length <= 1
    ? [[...items]]
    : items.flatMap((item, index) =>
        asPermutations([
          ...items.slice(0, index),
          ...items.slice(index + 1),
        ]).map((rest) => [item, ...rest]),
      );

const contentsLegacy =
  '*.png binary\n# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233\npackage-lock.json -diff\npnpm-lock.json -diff\n';

/**
 * .what = clamps that the five shipped declarers converge on one file, in any order
 * .why  = each declarer knows only its own sections; an order-dependent layout would make
 *         each rewrite the other's output on every `declapract apply` (oscillation).
 *         the suite spans practices, so it sits at the `src/` root, never inside one of them
 */
describe('gitattributes declarers converge', () => {
  given('every order of all five declarers, from a legacy file', () => {
    when("[t0] the clamp's declarer list is read beside the util's", () => {
      then('the clamp covers every declarer the util places, so a new one cannot skip it', () => {
        // .note = `[case3]` of practiceOwnerPerFile ties the util's list to the practices on disk
        expect(declarers.map((declarer) => declarer.name).sort()).toEqual(
          [...declarersOrderedForGitattributes].sort(),
        );
      });
    });

    when('[t1] each order folds its fixes over the legacy file', () => {
      const outputs = asPermutations(declarers).map((order) => ({
        order: order.map((declarer) => declarer.name).join(' → '),
        output: applyAll({ contents: contentsLegacy, order }),
      }));

      then('every order lands on one identical file', () => {
        const distinct = [...new Set(outputs.map((each) => each.output))];
        expect(distinct).toHaveLength(1);
        expect(distinct[0]).toMatchSnapshot();
      });

      then('each declarer is a fixed point on that file', () => {
        const output = outputs[0]!.output;
        declarers.forEach((declarer) =>
          expect(asContents(declarer.fix(output, context))).toEqual(output),
        );
      });
    });
  });

  given('a repo-own override glued, with no blank line, under the tests-any section', () => {
    const contentsGlued = [
      '# [tests-any] collapse test source in pr diffs; snapshots stay open',
      '*.test.ts linguist-generated',
      '*.test.tsx linguist-generated',
      'src/access/daos/custom/** -linguist-generated',
      '',
    ].join('\n');
    const lineOverride = 'src/access/daos/custom/** -linguist-generated';

    when('[t0] a declarer other than the block owner fixes the file', () => {
      // .note = a declarer cannot tell a foreign entry from a glued repo-own line, so it
      //         keeps the block whole; only the block's owner can lift the line out
      const output = applyAll({
        contents: contentsGlued,
        order: declarers.filter((declarer) => declarer.name === 'persist-with-rds'),
      });

      then('it keeps the foreign block verbatim, glued line included', () => {
        expect(output).toContain(
          ['*.test.tsx linguist-generated', lineOverride].join('\n'),
        );
      });
    });

    when('[t1] the block owner fixes the file', () => {
      const output = applyAll({
        contents: contentsGlued,
        order: declarers.filter((declarer) => declarer.name === 'tests-any'),
      });

      then('it lifts the glued line out, to the repo-own lines, last', () => {
        expect(output?.trim().split('\n').slice(-1)[0]).toEqual(lineOverride);
        expect(output).toContain(
          ['*.test.tsx linguist-generated', '', lineOverride].join('\n'),
        );
      });
    });

    when('[t2] every order of all five fixes the file', () => {
      const outputs = asPermutations(declarers).map((order) =>
        applyAll({ contents: contentsGlued, order }),
      );

      then('every order lands on one file, with the override last', () => {
        expect([...new Set(outputs)]).toHaveLength(1);
        expect(outputs[0]?.trim().split('\n').slice(-1)[0]).toEqual(lineOverride);
      });
    });
  });

  given('every pair of declarers, from no file', () => {
    const pairs = declarers.flatMap((first, index) =>
      declarers.slice(index + 1).map((second) => [first, second]),
    );

    when('[t0] each pair fixes an absent file in both orders', () => {
      const results = pairs.map(([first, second]) => ({
        forward: applyAll({ contents: null, order: [first!, second!] }),
        reverse: applyAll({ contents: null, order: [second!, first!] }),
      }));

      then('both orders of each pair land on one identical file', () => {
        results.forEach((result) => expect(result.forward).toEqual(result.reverse));
      });
    });
  });
});
