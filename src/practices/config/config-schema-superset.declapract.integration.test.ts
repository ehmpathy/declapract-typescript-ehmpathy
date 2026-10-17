import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FileCheckContext, FileFixContext } from 'declapract';
import { getError, given, then, when } from 'test-fns';

import {
  check,
  fix,
} from './best-practice/src/utils/config/config.schema.ts.declapract';

/**
 * .what = clamps #658: config's `config.schema.ts` check passes on any superset of the base schema,
 *         so the persist-with-rds template (its owner where in play) is never rewritten to the base,
 *         and a schema that dropped a base name is caught.
 * .teeth = revert the check to EQUALS and case2 goes red; revert it to a bare presence check and
 *          case3 goes red.
 */

const templateBase = readFileSync(
  join(__dirname, 'best-practice/src/utils/config/config.schema.ts'),
  'utf-8',
);
const templateRds = readFileSync(
  join(
    __dirname,
    '../persist-with-rds/best-practice/src/utils/config/config.schema.ts',
  ),
  'utf-8',
);
const context = {
  declaredFileContents: templateBase,
} as unknown as FileCheckContext & FileFixContext; // only declaredFileContents is read

describe('config.schema.ts — a superset check (#658)', () => {
  given('[case1] the file is absent', () => {
    when('[t0] check, then fix, then check', () => {
      then('check fails, fix writes the base, and check then passes', async () => {
        expect(await getError(async () => check(null, context))).toBeInstanceOf(Error);
        const fixed = await fix(null, context);
        expect(fixed.contents).toEqual(templateBase);
        expect(() => check(fixed.contents, context)).not.toThrow();
      });
    });
  });

  given('[case2] a schema that extends the base', () => {
    when('[t0] the persist-with-rds template is checked', () => {
      then('it passes, and fix leaves it byte-identical', async () => {
        expect(() => check(templateRds, context)).not.toThrow();
        expect((await fix(templateRds, context)).contents).toEqual(templateRds);
      });
    });

    when('[t1] a service schema with its own keys is checked', () => {
      const extended = templateBase.replace(
        '  aws: z.object({',
        '  openai: z.object({ apiKey: z.string() }),\n  aws: z.object({',
      );
      then('it passes', () => {
        expect(extended).toContain('openai:');
        expect(() => check(extended, context)).not.toThrow();
      });
    });
  });

  given('[case3] a schema that dropped a base name', () => {
    const drifted = templateBase.replace('    namespace: z.string(),\n', '');

    when('[t0] check runs', () => {
      then('it fails and names the absent key', async () => {
        const error = await getError(async () => check(drifted, context));
        expect(error.message).toContain('namespace');
        expect(error.message).not.toContain('organization');
      });
    });

    when('[t1] fix runs, then check, then fix again', () => {
      then('fix stamps one marker that names the key; check passes; a rerun is a no-op', async () => {
        const once = (await fix(drifted, context)).contents as string;
        expect(once.split('\n')[0]).toContain('@declapract:review');
        expect(once.split('\n')[0]).toContain('namespace');
        expect(once).toContain(drifted); // the service's own text is untouched
        expect(() => check(once, context)).not.toThrow();
        expect((await fix(once, context)).contents).toEqual(once);
        expect(once.split('\n')[0]).toMatchSnapshot('config.schema.ts — marker line');
      });
    });
  });
});
