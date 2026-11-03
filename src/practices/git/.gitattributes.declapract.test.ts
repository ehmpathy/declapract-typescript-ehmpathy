import { stripVTControlCharacters } from 'node:util';

import { getError } from 'test-fns';

import { check, fix } from './best-practice/.gitattributes.declapract';

const context = {} as Parameters<typeof fix>[1]; // .note = the fix reads no context

const EXPECTED_FULL_CONTENT = `# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# [git] auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

// .note = the verbatim header of the prior template; a fix must recognize it to lift it
const HEADER_MERGE_PRIOR =
  '# auto-resolve lock file conflicts by taking theirs; run install after merge';

// the untagged prior template, as an adopter holds it today
const CONTENTS_PRIOR_TEMPLATE = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

${HEADER_MERGE_PRIOR}
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

// a borked legacy file: the old header, the typo entry, and a duplicate
const CONTENTS_BORKED_LEGACY = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
pnpm-lock.json -diff
package-lock.json -diff
`;

const TEST_CASES: { description: string; given: string | null; expect: string }[] = [
  {
    description: 'creates both sections when no file exists',
    given: null,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'keeps repo-own lines, after the managed sections',
    given: `# some other gitattributes
*.png binary
`,
    expect: `${EXPECTED_FULL_CONTENT}
# some other gitattributes
*.png binary
`,
  },
  {
    description: 'migrates the untagged headers of the prior template',
    given: CONTENTS_PRIOR_TEMPLATE,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'lifts the legacy header, the typo entry, and duplicates from a borked file',
    given: CONTENTS_BORKED_LEGACY,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'lifts the legacy header from the exact borked file of the user report',
    given: `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'replaces a file that holds only the legacy header, with one entry kept once',
    given: `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'leaves the canonical file unchanged',
    given: EXPECTED_FULL_CONTENT,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'adds the merge section when only the diff section exists',
    given: `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'fills a section that lacks one of its entries',
    given: `# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# [git] auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'fills the prior template where each section holds only one entry',
    given: `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff

${HEADER_MERGE_PRIOR}
pnpm-lock.yaml merge=theirs
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'fills headers that hold no entries',
    given: `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233

${HEADER_MERGE_PRIOR}
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'collapses entries duplicated in both sections to one each',
    given: `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff
pnpm-lock.yaml -diff
package-lock.json -diff

${HEADER_MERGE_PRIOR}
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
pnpm-lock.yaml merge=theirs
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'collapses a run of blank lines between sections',
    given: `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff



${HEADER_MERGE_PRIOR}
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'restores the canonical order of entries out of order',
    given: `# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
pnpm-lock.yaml -diff

# [git] auto-resolve lock file conflicts by taking theirs; run install after merge
package-lock.json merge=theirs
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'restores the canonical order of entries out of order in both sections',
    given: `# [git] exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
pnpm-lock.yaml -diff

# [git] auto-resolve lock file conflicts by taking theirs; run install after merge
package-lock.json merge=theirs
pnpm-lock.yaml merge=theirs
`,
    expect: EXPECTED_FULL_CONTENT,
  },
  {
    description: 'lifts managed entries out of a repo-own block',
    given: `*.png binary
package-lock.json -diff
pnpm-lock.yaml merge=theirs
`,
    expect: `${EXPECTED_FULL_CONTENT}
*.png binary
`,
  },
  {
    description: "keeps another practice's tagged section, in declarer order",
    given: `# [tests-any] collapse test source in pr diffs; snapshots stay open
*.test.ts linguist-generated
`,
    expect: `${EXPECTED_FULL_CONTENT}
# [tests-any] collapse test source in pr diffs; snapshots stay open
*.test.ts linguist-generated
`,
  },
];

describe('.gitattributes best practice', () => {
  TEST_CASES.forEach((thisCase) =>
    describe(thisCase.description, () => {
      it('fix emits the expected file', async () => {
        const { contents } = await fix(thisCase.given, context);
        expect(contents).toEqual(thisCase.expect);
      });

      it('fix(fix(x)) === fix(x) — the second pass changes zero', async () => {
        const { contents: once } = await fix(thisCase.given, context);
        const { contents: twice } = await fix(once, context);
        expect(twice).toEqual(once);
      });

      it('check passes on the fixed output', async () => {
        const { contents: once } = await fix(thisCase.given, context);
        expect(() => check(once, context)).not.toThrow();
      });
    }),
  );

  describe('check', () => {
    it('passes on the canonical file', () => {
      expect(() => check(EXPECTED_FULL_CONTENT, context)).not.toThrow();
    });

    it('throws on the untagged prior template, so a plan flags it', async () => {
      const error = await getError(async () =>
        check(CONTENTS_PRIOR_TEMPLATE, context),
      );
      // the plan shows the adopter this diff: received vs the file the fix would write
      const message = stripVTControlCharacters(error.message);
      expect(message).toContain('toEqual');
      expect(message).toContain('# [git] ');
      expect(message).toMatchSnapshot();
    });

    it('throws when the entries of a section sit out of order', async () => {
      const outOfOrder = EXPECTED_FULL_CONTENT.replace(
        'pnpm-lock.yaml -diff\npackage-lock.json -diff',
        'package-lock.json -diff\npnpm-lock.yaml -diff',
      );
      expect(outOfOrder).not.toEqual(EXPECTED_FULL_CONTENT);
      const error = await getError(async () => check(outOfOrder, context));
      expect(stripVTControlCharacters(error.message)).toContain('toEqual');
    });

    it('throws when repo-own lines sit ahead of the managed sections', async () => {
      const error = await getError(async () =>
        check(`*.png binary\n\n${EXPECTED_FULL_CONTENT}`, context),
      );
      expect(stripVTControlCharacters(error.message)).toContain('toEqual');
    });

    it('throws when no file exists', async () => {
      const error = await getError(async () => check(null, context));
      expect(stripVTControlCharacters(error.message)).toContain('toEqual');
    });
  });

  it('snapshot: a borked legacy file, after one fix', async () => {
    const { contents } = await fix(CONTENTS_BORKED_LEGACY, context);
    expect(contents).not.toContain('# exclude package-lock from git diff');
    expect(contents).not.toContain('pnpm-lock.json -diff');
    expect(contents).toEqual(EXPECTED_FULL_CONTENT);
    expect(contents).toMatchSnapshot();
  });

  it('snapshot: managed entries outside any section, beside a repo-own line, after one fix', async () => {
    const { contents } = await fix(
      '*.png binary\npackage-lock.json -diff\npnpm-lock.yaml merge=theirs\n',
      context,
    );
    expect(contents).toEqual(`${EXPECTED_FULL_CONTENT}\n*.png binary\n`);
    expect(contents).toMatchSnapshot();
  });

  it('snapshot: repo-own lines above the prior template, after one fix', async () => {
    const { contents } = await fix(`*.png binary\n\n${CONTENTS_PRIOR_TEMPLATE}`, context);
    expect(contents).toEqual(`${EXPECTED_FULL_CONTENT}\n*.png binary\n`);
    expect(contents).toMatchSnapshot();
  });
});
