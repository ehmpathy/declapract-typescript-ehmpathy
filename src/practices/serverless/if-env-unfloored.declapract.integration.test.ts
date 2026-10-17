import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #660: the serverless practice floors no `if-env`
 * .why  = every serverless package command gates on `ACCESS` in plain shell
 *         (`[ "${ACCESS:-}" = 'prep' ]`), so a floor on `if-env` forced every adopter to install a
 *         package no command calls
 * .teeth = re-add `"if-env": "@declapract{check.minVersion('1.0.4')}"` to the serverless
 *          package.json and case1 goes red
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it reads the template on disk
 */

const template = readFileSync(
  join(__dirname, 'best-practice/package.json'),
  'utf-8',
);
const parsed = JSON.parse(template) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
const commands = Object.entries(parsed.scripts ?? {});

describe('serverless floors no if-env (#660)', () => {
  given('[case1] the serverless best-practice package.json', () => {
    when('[t0] its deps and commands are read', () => {
      then('no dep section names if-env', () => {
        expect(Object.keys(parsed.dependencies ?? {})).not.toContain('if-env');
        expect(Object.keys(parsed.devDependencies ?? {})).not.toContain('if-env');
      });

      then('no package command calls if-env, so naught needs it', () => {
        expect(commands.length).toBeGreaterThan(0);
        expect(commands.filter(([, command]) => command.includes('if-env'))).toEqual([]);
      });
    });
  });
});
