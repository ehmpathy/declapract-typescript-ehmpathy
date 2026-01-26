import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { given, then, when } from 'test-fns';

import { merge } from './merge';

describe('merge command', () => {
  const createTempFiles = (input: {
    base: string;
    ours: string;
    theirs: string;
  }): { basePath: string; oursPath: string; theirsPath: string; cleanup: () => void } => {
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

  given('dependency conflicts only', () => {
    when('merged', () => {
      const files = createTempFiles({
        base: JSON.stringify({ name: 'pkg', dependencies: { lodash: '4.17.20' } }),
        ours: JSON.stringify({ name: 'pkg', dependencies: { lodash: '4.17.21' } }),
        theirs: JSON.stringify({ name: 'pkg', dependencies: { lodash: '4.17.22' } }),
      });

      afterAll(() => files.cleanup());

      then('returns exit code 0', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toEqual(0);
      });

      then('writes merged result to ours path', () => {
        merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        const result = fs.readFileSync(files.oursPath, 'utf-8');
        const parsed = JSON.parse(result);
        expect(parsed.dependencies.lodash).toEqual('4.17.22');
      });
    });
  });

  given('conflict markers in ours', () => {
    when('merged', () => {
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

      then('returns exit code 1 (conflicts left)', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toEqual(1);
      });
    });
  });

  given('invalid json in ours', () => {
    when('merged', () => {
      const files = createTempFiles({
        base: JSON.stringify({ name: 'pkg' }),
        ours: '{ invalid json }',
        theirs: JSON.stringify({ name: 'pkg' }),
      });

      afterAll(() => files.cleanup());

      then('returns exit code > 128 (error)', () => {
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

  given('empty base (new file conflict)', () => {
    when('merged', () => {
      const files = createTempFiles({
        base: JSON.stringify({}),
        ours: JSON.stringify({ name: 'pkg', dependencies: { a: '1.0.0' } }),
        theirs: JSON.stringify({ name: 'pkg', dependencies: { b: '2.0.0' } }),
      });

      afterAll(() => files.cleanup());

      then('returns exit code 0', () => {
        const exitCode = merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        expect(exitCode).toEqual(0);
      });

      then('unions both dependencies', () => {
        merge({
          basePath: files.basePath,
          oursPath: files.oursPath,
          theirsPath: files.theirsPath,
          pathname: 'package.json',
        });
        const result = fs.readFileSync(files.oursPath, 'utf-8');
        const parsed = JSON.parse(result);
        expect(parsed.dependencies.a).toEqual('1.0.0');
        expect(parsed.dependencies.b).toEqual('2.0.0');
      });
    });
  });
});
