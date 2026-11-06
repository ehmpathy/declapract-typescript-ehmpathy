import type { FileCheckFunction, FileFixFunction } from 'declapract';
import expect from 'expect';

import {
  defineExpectedGitattributesContents,
  type GitattributesSection,
} from '../../../utils/defineExpectedGitattributesContents';

/**
 * .what = the `.gitattributes` section this practice owns: test source folds in pr diffs
 * .why  = a test file is the how; its snapshot is the proof. github folds a file marked
 *         `linguist-generated`, one click away, so a pr opens on the snapshot diff and the
 *         source, and the test source waits for the reviewer who asks for it
 * .note = `*.snap` takes no line: linguist never marks a snapshot as generated, so it renders
 *         open. `*.test.tsx` covers the expo cut, whose jest matches
 *         `<star><star>/<star>.test.{ts,tsx}`
 * .note = `<star>` stands in for the literal `*` wildcard, and must stay a stand-in. a literal
 *         `*` immediately before a `/` closes this comment mid-prose
 * .note = `linguist-generated` names a render hint here, not provenance; the header says so
 */
const sections: readonly GitattributesSection[] = [
  {
    header: {
      latest:
        '# [tests-any] collapse test source in pr diffs; snapshots stay open',
      retired: [],
    },
    entries: {
      latest: ['*.test.ts linguist-generated', '*.test.tsx linguist-generated'],
      retired: [],
    },
  },
];

/**
 * .what = emits the `.gitattributes` this practice declares, given the repo's extant one
 * .why  = several practices declare this file; they converge only through the shared util
 */
const defineExpectedContents = (input: { contents: string | null }): string =>
  defineExpectedGitattributesContents({
    contents: input.contents,
    declarer: 'tests-any',
    sections,
  });

/**
 * .what = throws when the repo's `.gitattributes` differs from what the shared layout emits
 * .why  = `check` gates `fix` (a throw means violated); exact equality, so `check(x) ⟺ x === fix(x)`
 */
export const check: FileCheckFunction = (contents) => {
  expect(contents).toEqual(defineExpectedContents({ contents }));
};

/**
 * .what = sets this practice's section into the repo's `.gitattributes`
 * .why  = a fixed point: a second fix changes zero, and `check` passes on the output
 */
export const fix: FileFixFunction = (contents) => ({
  contents: defineExpectedContents({ contents }),
});
