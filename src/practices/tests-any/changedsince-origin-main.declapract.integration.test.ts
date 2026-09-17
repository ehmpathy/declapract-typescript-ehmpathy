import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

/**
 * .what = clamps #531: the shipped `test:unit` + `test:integration` commands scope changed-file
 *         detection against `origin/main`, NEVER bare `main`.
 * .why  = a local `main` drifts behind the real trunk the moment a teammate merges without a local
 *         pull, so `--changedSince=main` drags unrelated already-merged suites into scope — the
 *         exact stale-ref defect #531 names. `origin/main` is the true fork point, so the scope
 *         holds only this branch's own change.
 * .teeth = revert either command to `--changedSince=main` in best-practice/package.json and the
 *          "no bare main" assertion reddens (the emitted `echo '--changedSince=main'` carries the
 *          `--changedSince=main'` token; the origin form carries `--changedSince=origin/main'`,
 *          which does NOT contain it).
 * .note = the subject is the shipped TEMPLATE, read once from __dirname (a single static-file read,
 *         as the kin `dpdmrc-exclude-policy` / `commitlint-body-max-line` clamps do). this file
 *         sits at the practice ROOT, so declapract never emits it (per the #583 relocation convention).
 */
describe('tests-any changedSince=origin/main policy', () => {
  given('the shipped best-practice/package.json', () => {
    const parsed = JSON.parse(
      readFileSync(join(__dirname, 'best-practice/package.json'), 'utf8'),
    );
    const scripts: Record<string, string> = parsed?.scripts ?? {};

    when('the changed-file test commands are read', () => {
      then('test:unit scopes against origin/main', () => {
        expect(scripts['test:unit']).toContain('--changedSince=origin/main');
      });

      then('test:integration scopes against origin/main', () => {
        expect(scripts['test:integration']).toContain(
          '--changedSince=origin/main',
        );
      });

      then('neither command scopes against a bare local main', () => {
        // the emitted flag is quoted: `echo '--changedSince=origin/main'`. a bare-main revert
        // emits `echo '--changedSince=main'`, whose `--changedSince=main'` token the origin form
        // never carries — so this token is the precise teeth for the drift #531 forbids.
        const bareMainToken = "--changedSince=main'";
        expect(scripts['test:unit']).not.toContain(bareMainToken);
        expect(scripts['test:integration']).not.toContain(bareMainToken);
      });

      // the emitted commands are the caller-faced contract: snapshot both so a reword that keeps
      // the origin token green (a re-ordered flag, a reshaped command) reddens a vibecheck.
      then('the emitted changed-file commands match snapshot', () => {
        expect({
          'test:unit': scripts['test:unit'],
          'test:integration': scripts['test:integration'],
        }).toMatchSnapshot('tests-any changed-file commands');
      });
    });
  });
});
