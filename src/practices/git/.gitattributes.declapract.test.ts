import { FileCheckType } from 'declapract';

import { check, fix } from './best-practice/.gitattributes.declapract';

const EXPECTED_FULL_CONTENT = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

describe('.gitattributes best practice', () => {
  describe('check', () => {
    it('should be FileCheckType.CONTAINS', () => {
      expect(check).toBe(FileCheckType.CONTAINS);
    });
  });

  describe('fix', () => {
    it('should create file with both sections when contents is null', async () => {
      const result = await fix(null, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should append both sections when neither header is found', async () => {
      const contents = `# some other gitattributes
*.png binary
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# some other gitattributes
*.png binary

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`,
      );
    });

    it('should insert missing pnpm-lock.yaml -diff entry after header', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(
        `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`,
      );
    });

    it('should insert missing package-lock.json -diff entry, in canonical order', async () => {
      // .note = canonical order, never "after the header": the check is CONTAINS of the whole
      //         template, so an entry inserted ahead of its sibling would never pass it
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should add merge section when only diff section exists', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should insert missing merge=theirs entries, in canonical order', async () => {
      // .note = canonical order, so the output CONTAINS the template (see the -diff case above)
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should return contents unchanged when all entries are present', async () => {
      const result = await fix(EXPECTED_FULL_CONTENT, {} as any);

      expect(result.contents).toBe(EXPECTED_FULL_CONTENT);
    });

    it('should handle headers with no entries', async () => {
      const contents = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233

# auto-resolve lock file conflicts by taking theirs; run install after merge
`;

      const result = await fix(contents, {} as any);

      expect(result.contents).toContain('pnpm-lock.yaml -diff');
      expect(result.contents).toContain('package-lock.json -diff');
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should remove legacy header and deduplicate entries from borked file', async () => {
      // this is the exact borked input scenario that prompted the fix
      const borkedContents = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
pnpm-lock.json -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(borkedContents, {} as any);

      // should have removed the legacy header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have the correct header
      expect(result.contents).toContain(
        '# exclude package locks from git diff',
      );

      // should not have duplicate package-lock.json -diff
      const diffMatches = result.contents!.match(/package-lock\.json -diff/g);
      expect(diffMatches).toHaveLength(1);

      // should still have all required entries
      expect(result.contents).toContain('pnpm-lock.yaml -diff');
      expect(result.contents).toContain('package-lock.json -diff');
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should deduplicate entries that appear multiple times', async () => {
      const contentsWithDuplicates = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff
pnpm-lock.yaml -diff
package-lock.json -diff

# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
pnpm-lock.yaml merge=theirs
`;

      const result = await fix(contentsWithDuplicates, {} as any);

      // each entry should appear exactly once
      const pnpmDiffMatches = result.contents!.match(/pnpm-lock\.yaml -diff/g);
      const pkgDiffMatches = result.contents!.match(/package-lock\.json -diff/g);
      const pnpmMergeMatches = result.contents!.match(
        /pnpm-lock\.yaml merge=theirs/g,
      );
      const pkgMergeMatches = result.contents!.match(
        /package-lock\.json merge=theirs/g,
      );

      expect(pnpmDiffMatches).toHaveLength(1);
      expect(pkgDiffMatches).toHaveLength(1);
      expect(pnpmMergeMatches).toHaveLength(1);
      expect(pkgMergeMatches).toHaveLength(1);
    });

    it('should replace legacy header with correct header when only legacy exists', async () => {
      const contentsWithLegacyOnly = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
`;

      const result = await fix(contentsWithLegacyOnly, {} as any);

      // should have removed the legacy header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have the correct header with all entries
      expect(result.contents).toContain(
        '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
      );
      expect(result.contents).toContain('pnpm-lock.yaml -diff');
      expect(result.contents).toContain('package-lock.json -diff');

      // should have the merge section too
      expect(result.contents).toContain(
        '# auto-resolve lock file conflicts by taking theirs; run install after merge',
      );
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should collapse multiple consecutive empty lines', async () => {
      const contentsWithExtraLines = `# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.yaml -diff
package-lock.json -diff



# auto-resolve lock file conflicts by taking theirs; run install after merge
pnpm-lock.yaml merge=theirs
package-lock.json merge=theirs
`;

      const result = await fix(contentsWithExtraLines, {} as any);

      // should not have more than one consecutive empty line
      expect(result.contents).not.toContain('\n\n\n');
    });

    it('should fix exact borked input from user report', async () => {
      // exact input from user report
      const borkedInput = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff

# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`;

      const result = await fix(borkedInput, {} as any);

      // should have removed the prior header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have deduplicated package-lock.json -diff
      const pkgDiffMatches = result.contents!.match(/package-lock\.json -diff/g);
      expect(pkgDiffMatches).toHaveLength(1);

      // should have removed pnpm-lock.json -diff (prior entry, typo)
      expect(result.contents).not.toContain('pnpm-lock.json -diff');

      // should have the latest pnpm-lock.yaml -diff
      expect(result.contents).toContain('pnpm-lock.yaml -diff');

      // should have added merge section
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });

    it('should not duplicate entry when legacy header removed but entry remains', async () => {
      // scenario: legacy header removed, but its entry (package-lock.json -diff)
      // stays because it's a valid latest entry. ensureSection must not duplicate it.
      const legacyOnlyInput = `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
package-lock.json -diff
`;

      const result = await fix(legacyOnlyInput, {} as any);

      // should have exactly one package-lock.json -diff
      const pkgDiffMatches = result.contents!.match(/package-lock\.json -diff/g);
      expect(pkgDiffMatches).toHaveLength(1);

      // should have the latest header
      expect(result.contents).toContain(
        '# exclude package locks from git diff; https://stackoverflow.com/a/72834452/3068233',
      );

      // should not have the legacy header
      expect(result.contents).not.toContain(
        '# exclude package-lock from git diff',
      );

      // should have added the absent pnpm-lock.yaml -diff
      expect(result.contents).toContain('pnpm-lock.yaml -diff');

      // should have the merge section
      expect(result.contents).toContain('pnpm-lock.yaml merge=theirs');
      expect(result.contents).toContain('package-lock.json merge=theirs');
    });
  });

  /**
   * .what = the twice-applied clamp (rule.require.idempotent-fixes), over non-canonical inputs
   * .why  = the check is CONTAINS, a substring match of the whole template. so the fixed output
   *         must be a fixed point AND must contain the template verbatim — else the plan flags
   *         the file forever, even though each fix leaves its bytes alone
   */
  describe('idempotency', () => {
    const TEMPLATE = EXPECTED_FULL_CONTENT.trim();
    const [HEADER_DIFF, , , , HEADER_MERGE] = EXPECTED_FULL_CONTENT.split('\n');

    const NON_CANONICAL_INPUTS: { description: string; contents: string }[] = [
      {
        description: 'a legacy header and a legacy entry',
        contents: `# exclude package-lock from git diff; https://stackoverflow.com/a/72834452/3068233
pnpm-lock.json -diff
package-lock.json -diff
`,
      },
      {
        description: 'a managed entry outside its section, before any header',
        contents: `*.png binary
package-lock.json -diff
pnpm-lock.yaml merge=theirs
`,
      },
      {
        description: 'the managed entries of a section out of order',
        contents: `${HEADER_DIFF}
package-lock.json -diff
pnpm-lock.yaml -diff

${HEADER_MERGE}
package-lock.json merge=theirs
pnpm-lock.yaml merge=theirs
`,
      },
      {
        description: 'a section header with only one of its entries',
        contents: `${HEADER_DIFF}
pnpm-lock.yaml -diff

${HEADER_MERGE}
pnpm-lock.yaml merge=theirs
`,
      },
    ];

    NON_CANONICAL_INPUTS.forEach((thisCase) =>
      describe(thisCase.description, () => {
        it('fix(fix(x)) === fix(x) — the second pass changes zero', async () => {
          const { contents: once } = await fix(thisCase.contents, {} as any);
          const { contents: twice } = await fix(once, {} as any);
          expect(twice).toEqual(once);
        });

        it('the fixed output contains the template verbatim — the CONTAINS check passes', async () => {
          const { contents: once } = await fix(thisCase.contents, {} as any);
          expect(once).toContain(TEMPLATE);
        });

        it('each managed entry appears exactly once', async () => {
          const { contents: once } = await fix(thisCase.contents, {} as any);
          [
            'pnpm-lock.yaml -diff',
            'package-lock.json -diff',
            'pnpm-lock.yaml merge=theirs',
            'package-lock.json merge=theirs',
          ].forEach((entry) =>
            expect(
              once!.split('\n').filter((line) => line.trim() === entry),
            ).toHaveLength(1),
          );
        });
      }),
    );

    it('keeps the repo-own lines of a non-canonical input', async () => {
      const { contents: once } = await fix(
        NON_CANONICAL_INPUTS[1]!.contents,
        {} as any,
      );
      expect(once).toContain('*.png binary');
      expect(once).toMatchSnapshot(
        '.gitattributes — out-of-section input, after one fix',
      );
    });
  });
});
