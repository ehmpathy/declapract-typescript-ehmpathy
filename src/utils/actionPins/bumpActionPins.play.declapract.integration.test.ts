import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = play test of the bump command, run the way `bump-action-pins.yml` runs it, against a
 *         fake `gh` first on PATH (#556)
 * .why  = the command crosses two boundaries — the github api and the disk — and its one trap is
 *         the annotated tag: a ref whose `.object.type` reads `tag` names a tag object, not a
 *         commit, and a pin to it is rejected by github. the fake answers with an annotated major
 *         tag and a newer full tag, so the test proves the deref and the in-major target choice
 * .note = plan mode only: it reads this repo's real pins and writes no file, which the last
 *         assertion proves. apply mode is the same rewrite the actionPins note documents
 */

const COMMAND_PATH = path.join(__dirname, 'bumpActionPins.ts');
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SHA_TAG_OBJECT = 'a'.repeat(40);
const SHA_MAJOR_COMMIT = 'b'.repeat(40);
const SHA_FULL_COMMIT = 'c'.repeat(40);

/**
 * .what = a fake gh: each repo publishes `<prefix>` as an annotated tag, and `<prefix>.99.0` as a
 *         lightweight tag on a newer commit
 */
const FAKE_GH = [
  '#!/usr/bin/env bash',
  'set -eu',
  'route="${@: -1}"',
  'if [[ "$route" == */git/matching-refs/tags/* ]]; then',
  '  prefix="${route##*/git/matching-refs/tags/}"',
  `  printf '[{"ref":"refs/tags/%s","object":{"sha":"${SHA_TAG_OBJECT}","type":"tag"}},{"ref":"refs/tags/%s.99.0","object":{"sha":"${SHA_FULL_COMMIT}","type":"commit"}}]' "$prefix" "$prefix"`,
  '  exit 0',
  'fi',
  'if [[ "$route" == */git/tags/* ]]; then',
  `  printf '{"object":{"sha":"${SHA_MAJOR_COMMIT}","type":"commit"}}'`,
  '  exit 0',
  'fi',
  'echo "fake gh: unknown route $route" >&2',
  'exit 1',
].join('\n');

describe('bumpActionPins', () => {
  given('[case1] a github whose tags all moved', () => {
    when('[t0] the command runs in plan mode', () => {
      const scene = useBeforeAll(() => {
        const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-action-pins-'));
        fs.writeFileSync(path.join(bin, 'gh'), FAKE_GH, { mode: 0o755 });
        const probePath = path.join(REPO_ROOT, '.github/workflows/test.yml');
        const probeBefore = fs.readFileSync(probePath, 'utf-8');
        const res = spawnSync(
          'node',
          ['-r', 'esbuild-register', COMMAND_PATH, '--mode', 'plan'],
          {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            env: { ...process.env, PATH: `${bin}:${process.env['PATH'] ?? ''}` },
          },
        );
        return {
          res,
          probeUnchanged: fs.readFileSync(probePath, 'utf-8') === probeBefore,
        };
      });

      then('it exits 0', () => {
        expect(scene.res.stderr).toEqual('');
        expect(scene.res.status).toEqual(0);
      });

      then('a major-only pin moves to the commit its annotated tag names, never the tag object', () => {
        expect(scene.res.stdout).toContain(
          `actions/checkout: v4 11d5960 → v4 ${SHA_MAJOR_COMMIT.slice(0, 7)}`,
        );
        expect(scene.res.stdout).not.toContain(SHA_TAG_OBJECT.slice(0, 7));
      });

      then('a full-version pin moves to the newest full tag of its major', () => {
        // reads: `<repo>: 0.2.0 <any 7-char from-sha> → 0.99.0 <the full-tag commit, short>`
        expect(scene.res.stdout).toMatch(
          new RegExp(`Entle/action-pagerduty-alert: 0\\.2\\.0 \\w{7} → 0\\.99\\.0 ${SHA_FULL_COMMIT.slice(0, 7)}`),
        );
      });

      then('plan mode writes no file', () => {
        expect(scene.res.stdout).toContain('(plan; no file written)');
        expect(scene.probeUnchanged).toEqual(true);
      });
    });
  });
});
