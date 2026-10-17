import { given, then, when } from 'test-fns';

import { check, fix } from './*.ts.declapract';

describe('logs leveled-term src files (#643)', () => {
  given('[case1] a wrapper that still imports simple-leveled-log-methods', () => {
    const before = `import { LogMethods } from 'domain-objects';
import { generateLogMethods } from 'simple-leveled-log-methods';

export const log = generateLogMethods();
`;

    when('[t0] the check reads it', () => {
      then('it flags the file, so plan names it before the dep leaves', () => {
        expect(() => check(before, {} as any)).not.toThrow();
      });
    });

    when('[t1] the fix runs', () => {
      then('a review line lands directly above the import and names sdk-logs genLogMethods', async () => {
        const { contents: after } = await fix(before, {} as any);
        const lines = after!.split('\n');
        const importIndex = lines.findIndex((line) =>
          line.includes("from 'simple-leveled-log-methods'"),
        );
        expect(lines[importIndex - 1]).toContain('// @declapract:review:');
        expect(lines[importIndex - 1]).toContain('genLogMethods');
        expect(lines[importIndex - 1]).toContain('sdk-logs');
        // no code line is rewritten
        expect(after!.replace(/^.*@declapract:review.*\n/m, '')).toEqual(before);
        expect(after).toMatchSnapshot('wrapper — after');
      });

      then('a second fix pass is a no-op (the marker is not stamped twice)', async () => {
        const { contents: once } = await fix(before, {} as any);
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a file that imports sdk-logs only', () => {
    then('the check skips it', () => {
      expect(() =>
        check(`import { genLogMethods } from 'sdk-logs';`, {} as any),
      ).toThrow('does not match bad practice');
    });
  });
});
