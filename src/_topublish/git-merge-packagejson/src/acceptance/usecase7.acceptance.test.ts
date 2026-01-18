/**
 * usecase.7: git integration
 *
 * the tool should work as a git merge driver:
 * - can be invoked directly on files
 * - returns correct exit codes
 * - configures git properly via --install
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { given, then, when } from 'test-fns';

import { merge } from '../contract/commands/merge';

describe('usecase.7: git integration', () => {
  const createTempFiles = (input: {
    base: string;
    ours: string;
    theirs: string;
  }): {
    basePath: string;
    oursPath: string;
    theirsPath: string;
    cleanup: () => void;
  } => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-merge-test-'));
    const basePath = path.join(tmpDir, 'base.json');
    const oursPath = path.join(tmpDir, 'ours.json');
    const theirsPath = path.join(tmpDir, 'theirs.json');

    fs.writeFileSync(basePath, input.base);
    fs.writeFileSync(oursPath, input.ours);
    fs.writeFileSync(theirsPath, input.theirs);

    return {
      basePath,
      oursPath,
      theirsPath,
      cleanup: () => fs.rmSync(tmpDir, { recursive: true }),
    };
  };

  given('direct invocation on files', () => {
    when('all deps resolved successfully', () => {
      const files = createTempFiles({
        base: JSON.stringify({
          name: 'pkg',
          dependencies: { lodash: '4.17.20' },
        }),
        ours: JSON.stringify({
          name: 'pkg',
          dependencies: { lodash: '4.17.21' },
        }),
        theirs: JSON.stringify({
          name: 'pkg',
          dependencies: { lodash: '4.17.22' },
        }),
      });

      afterAll(() => files.cleanup());

      then('exit code is 0', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toEqual(0);
      });

      then('result is written to oursPath', () => {
        merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        const content = fs.readFileSync(files.oursPath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
      });
    });

    when('non-dep conflicts remain', () => {
      const conflictedOurs = `{
  "name": "pkg",
<<<<<<< HEAD
  "version": "1.0.1",
=======
  "version": "1.0.2",
>>>>>>> feature
  "dependencies": { "lodash": "4.17.21" }
}`;

      const files = createTempFiles({
        base: JSON.stringify({
          name: 'pkg',
          version: '1.0.0',
          dependencies: { lodash: '4.17.20' },
        }),
        ours: conflictedOurs,
        theirs: JSON.stringify({
          name: 'pkg',
          version: '1.0.2',
          dependencies: { lodash: '4.17.22' },
        }),
      });

      afterAll(() => files.cleanup());

      then('exit code is 1', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toEqual(1);
      });
    });

    when('parse error occurs', () => {
      const files = createTempFiles({
        base: JSON.stringify({ name: 'pkg' }),
        ours: '{ not valid json }',
        theirs: JSON.stringify({ name: 'pkg' }),
      });

      afterAll(() => files.cleanup());

      then('exit code is > 128', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toBeGreaterThan(128);
      });
    });
  });

  given('file not found', () => {
    when('base file does not exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-merge-test-'));
      const oursPath = path.join(tmpDir, 'ours.json');
      const theirsPath = path.join(tmpDir, 'theirs.json');

      fs.writeFileSync(oursPath, JSON.stringify({ name: 'pkg' }));
      fs.writeFileSync(theirsPath, JSON.stringify({ name: 'pkg' }));

      afterAll(() => fs.rmSync(tmpDir, { recursive: true }));

      then('exit code is > 128', () => {
        const exitCode = merge({
          basePath: path.join(tmpDir, 'nonexistent.json'),
          oursPath,
          theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toBeGreaterThan(128);
      });
    });
  });

  given('complex merge scenario', () => {
    when('multiple sections with additions and removals', () => {
      const files = createTempFiles({
        base: JSON.stringify({
          name: 'pkg',
          version: '1.0.0',
          dependencies: {
            lodash: '4.17.20',
            express: '4.17.0',
          },
          devDependencies: {
            jest: '29.0.0',
            typescript: '4.9.0',
          },
        }),
        ours: JSON.stringify({
          name: 'pkg',
          version: '1.0.0',
          dependencies: {
            lodash: '4.17.21',
            // express removed
            axios: '1.0.0', // added
          },
          devDependencies: {
            jest: '29.5.0',
            typescript: '5.0.0',
          },
        }),
        theirs: JSON.stringify({
          name: 'pkg',
          version: '1.0.0',
          dependencies: {
            lodash: '4.17.22',
            express: '4.18.0',
          },
          devDependencies: {
            jest: '29.7.0',
            // typescript removed
            vitest: '1.0.0', // added
          },
        }),
      });

      afterAll(() => files.cleanup());

      then('exit code is 0', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toEqual(0);
      });

      then('all changes merged correctly', () => {
        merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        const content = fs.readFileSync(files.oursPath, 'utf-8');
        const parsed = JSON.parse(content);

        // dependencies
        expect(parsed.dependencies.lodash).toEqual('4.17.22'); // higher wins
        expect(parsed.dependencies.express).toBeUndefined(); // removal wins
        expect(parsed.dependencies.axios).toEqual('1.0.0'); // addition

        // devDependencies
        expect(parsed.devDependencies.jest).toEqual('29.7.0'); // higher wins
        expect(parsed.devDependencies.typescript).toBeUndefined(); // removal wins
        expect(parsed.devDependencies.vitest).toEqual('1.0.0'); // addition
      });
    });
  });
});
