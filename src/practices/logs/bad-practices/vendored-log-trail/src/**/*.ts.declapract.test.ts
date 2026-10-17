import { given, then, when } from 'test-fns';

import { check, fix } from './*.ts.declapract';

const FORK = `import { log } from '@src/utils/logger';

/**
 * enables input output logs for a function
 *
 * todo: - add tracing identifier w/ async-context
 * todo: - hookup visual tracing w/ external lib (vi...lo...)
 * todo: - bundle this with its own logging library which supports scoped logs
 */
export const withInputOutputTracing = <T extends (...args: any[]) => any>(
  logic: T,
  options: { name: string; durationReportingThresholdInSeconds: number },
): T => {
  return (async (...args: any[]) => {
    log.debug(\`\${options.name}.input\`, { args });
    const result = await logic(...args);
    log.debug(\`\${options.name}.output\`, { result });
    return result;
  }) as T;
};
`;

describe('logs vendored-log-trail src files (#635)', () => {
  given('[case1] a vendored fork of visualogic withLogTrail', () => {
    when('[t0] the check reads it', () => {
      then('it flags the fork', () => {
        expect(() => check(FORK, {} as any)).not.toThrow();
      });
    });

    when('[t1] the fix runs', () => {
      then('a review line above the fork export names the input→context move to withLogTrail', async () => {
        const { contents: after } = await fix(FORK, {} as any);
        const lines = after!.split('\n');
        const exportIndex = lines.findIndex((line) =>
          line.startsWith('export const withInputOutputTracing'),
        );
        expect(lines[exportIndex - 1]).toContain('// @declapract:review:');
        expect(lines[exportIndex - 1]).toContain('withLogTrail');
        expect(lines[exportIndex - 1]).toContain('(input, context)');
        // no code line is rewritten
        expect(after!.replace(/^.*@declapract:review.*\n/m, '')).toEqual(FORK);
        expect(after).toMatchSnapshot('fork — after');
      });

      then('a second fix pass is a no-op', async () => {
        const { contents: once } = await fix(FORK, {} as any);
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a file that uses visualogic withLogTrail itself', () => {
    then('the check skips it', () => {
      const contents = `import { withLogTrail } from 'visualogic';
export const sendInvoice = withLogTrail(_sendInvoice);`;
      expect(() => check(contents, {} as any)).toThrow('does not match bad practice');
    });
  });
});
