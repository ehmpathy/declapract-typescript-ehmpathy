import { FileCheckType } from 'declapract';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { check } from './best-practice/package.json.declapract';

/**
 * .why integration = the build-command assertions read the shipped `package.json` template
 *   from disk via readFileSync — a filesystem boundary. per rule.forbid.unit.remote-boundaries
 *   a `.test.ts` (unit) may not cross an fs boundary, so this guard (which exists to catch
 *   DRIFT in the real template's build commands) lives at the integration grain, where a real
 *   file read is permitted. an inline copy would test a hardcoded string, not the template,
 *   so it could not catch the drift this guards.
 */
describe('typescript-expo package.json', () => {
  it('declares a CONTAINS check (a repo may add its own build variants)', () => {
    expect(check).toEqual(FileCheckType.CONTAINS);
  });

  it('the emitted build command uses metro/EAS (expo export), not tsc', () => {
    const template = JSON.parse(
      readFileSync(path.join(__dirname, 'best-practice/package.json'), 'utf-8'),
    );
    // `build` aliases build:web so the shared cicd `npm run build` works on expo
    expect(template.scripts.build).toEqual('npm run build:web');
    // the web build is expo export, NOT a tsc build (an expo app never builds with tsc)
    expect(template.scripts['build:web']).toContain('expo export --platform web');
    expect(template.scripts.build).not.toContain('tsc');
  });

  it('build:web defaults ACCESS to prep, so an absent access never builds for prod (#619)', () => {
    // expo export inlines NODE_ENV=production into every bundle; an app that infers its access
    // from NODE_ENV then reaches prod. a declared default makes the absent case the safe one,
    // and an ACCESS the caller sets (the deploy compile step, start:cold:prod) still wins
    const template = JSON.parse(
      readFileSync(path.join(__dirname, 'best-practice/package.json'), 'utf-8'),
    );
    expect(template.scripts['build:web']).toMatch(/^ACCESS=\$\{ACCESS:-prep\} /);
  });

  it('build:web keeps the metro cache warm (no --clear), since metro.config.js keys it on ACCESS + app config (#618, #676)', () => {
    const template = JSON.parse(
      readFileSync(path.join(__dirname, 'best-practice/package.json'), 'utf-8'),
    );
    expect(template.scripts['build:web']).not.toContain('--clear');
  });

  it('the emitted build commands match snapshot', () => {
    // snapshot the governed build commands themselves, so a reshaped command that keeps the
    // pinned tokens green (a reordered flag, a rephrased alias) reddens a vibecheck in review
    // (rule.require.contract-snapshot-exhaustiveness)
    const template = JSON.parse(
      readFileSync(path.join(__dirname, 'best-practice/package.json'), 'utf-8'),
    );
    expect({
      build: template.scripts.build,
      'build:web': template.scripts['build:web'],
    }).toMatchSnapshot('typescript-expo build commands');
  });
});
