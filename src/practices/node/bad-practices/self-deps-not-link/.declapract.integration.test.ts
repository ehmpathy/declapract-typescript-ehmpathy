import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = end-to-end proof of the node/self-deps-not-link fix, run through the REAL declapract
 *   apply pipeline against a genTempDir clone of a consumer repo whose package.json lists its OWN
 *   name as a self-dependency at a real version (`1.2.3`, not `link:.`) across three dep sections
 *   (#571, repo-rules r1). the fixture spans all three cases the fix must get right at once:
 *     - `dependencies.svc-example: 1.2.3`      → a bad self-dep in a section with a peer → dropped, section kept
 *     - `devDependencies.svc-example: link:.`  → the CORRECT self-link → preserved untouched
 *     - `peerDependencies.svc-example: 1.2.3`  → a bad self-dep as the SOLE entry → dropped, empty section pruned
 * .why  = the fix is a `FileFixFunction` that transforms structured json (drops each bad self-dep,
 *   prunes any dep object it empties). a unit test of the transformer is necessary but NOT sufficient
 *   (`rule.require.declapract-integration-tests`): only the pipeline proves declapract wires the
 *   declaration up (glob→package.json match), that a bad-practice `check` that RETURNS gates the
 *   `fix`, and that the consumer's `declapract apply` produces the claimed end-state on a real file.
 * .teeth = revert the fix to a no-op (or drop the empty-section prune) and the after-state asserts
 *   redden — the bad self-dep survives, or the emptied `peerDependencies` lingers. flip the fixture's
 *   `devDependencies` entry off `link:.` and the preserve assert reddens.
 * .note = the package.json is snapshotted in full (before AND after) so a reviewer eyeballs the exact
 *   end-state (`rule.require.snapshots`). the scoped apply runs the WHOLE `node` practice (the `file`
 *   filter narrows which file is written, not which declarers evaluate), so the after-state COMPOSES
 *   two declarers: the self-deps-not-link transform (drops each bad self-dep) AND the node
 *   best-practice package.json — a CONTAINS check whose merge-fix stamps the declared
 *   author/repository/homepage/bugs/scripts fields. both are visible in the after-snapshot; the
 *   assertions above target only the self-deps transform, which is what this bad-practice owns.
 */
describe('node/self-deps-not-link removal', () => {
  given('[case1] a repo with its own name as a self-dep across three dep sections', () => {
    const tempDir = genTempDir({
      slug: 'declapract-node-self-deps-not-link',
      clone: './src/practices/node/bad-practices/self-deps-not-link/.test/assets/demo-repo-with-self-deps',
      symlink: [{ at: 'src', to: 'src' }],
    });

    const pkgPath = 'package.json';
    const read = (relativePath: string) =>
      fs.readFile(path.join(tempDir, relativePath), 'utf-8');
    const applyFix = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        practice: 'node',
        file: pkgPath,
      });

    when('[t0] the input (before any fix)', () => {
      then('the package.json input matches snapshot', async () => {
        expect(await read(pkgPath)).toMatchSnapshot('package.json — before');
      });
    });

    when('[t1] the self-deps-not-link fix is applied', () => {
      useThen('drop each bad self-dep, keep the link:. self-dep', async () =>
        applyFix(),
      );

      then(
        'the bad self-deps are gone, the link:. self-dep survives, the emptied section is pruned, and it matches snapshot',
        async () => {
          const pkg = JSON.parse(await read(pkgPath));
          // the bad self-dep (a real version, not link:.) is dropped from dependencies
          expect(pkg.dependencies?.['svc-example']).toBeUndefined();
          // ...but the section survives because a peer dep remains in it
          expect(pkg.dependencies?.uuid).toEqual('9.0.0');
          // the CORRECT self-link (`link:.`) is preserved untouched — it is not a bad self-dep
          expect(pkg.devDependencies?.['svc-example']).toEqual('link:.');
          expect(pkg.devDependencies?.jest).toEqual('29.3.1');
          // peerDependencies held ONLY the bad self-dep, so the drop empties + prunes the section
          expect(pkg.peerDependencies).toBeUndefined();
          // full content, for the reviewer's eye
          expect(await read(pkgPath)).toMatchSnapshot('package.json — after');
        },
      );
    });

    when('[t2] the fix is applied a second time (idempotency)', () => {
      // .note = once the bad self-deps are gone, the only self-dep left is the `link:.` in
      //   devDependencies, which the bad-practice `check` does NOT detect — so the second apply
      //   fires no fix and the file is a FIXED POINT. we assert the end-state holds rather than
      //   full-file byte equality, because the node best-practice package.json is a separate
      //   declarer (a CONTAINS check, out of scope here) whose behavior is not under test.
      const pkg = useThen('a second apply over its own output', async () => {
        await applyFix(); // second apply, over the post-first-fix output
        return JSON.parse(await read(pkgPath));
      });

      then('the bad self-deps stay gone and the link:. self-dep stays', () => {
        expect(pkg.dependencies?.['svc-example']).toBeUndefined();
        expect(pkg.peerDependencies).toBeUndefined();
        expect(pkg.devDependencies?.['svc-example']).toEqual('link:.');
      });

      then('the peer deps that remain are untouched by the re-apply', () => {
        expect(pkg.dependencies?.uuid).toEqual('9.0.0');
        expect(pkg.devDependencies?.jest).toEqual('29.3.1');
      });
    });
  });
});
