import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { genTempDir } from 'test-fns';

/**
 * .what = a temp repo for a whole-usecase apply, whose declarations mirror is mounted in a SEPARATE
 *         temp dir, and whose `declapract.use.yml` points there. returns the repo's physical path.
 * .why  = an apply walks every path of the repo it applies to — `**` globs, dot dirs, and links
 *         included. a declarations mirror mounted INSIDE the repo links back to this repo's real
 *         practice trees, fixtures and all, so an unscoped apply writes a `**` fix through the link
 *         into this repo's own source (tests-any's `__test_utils__/` → `.test.utils/` rewrite did,
 *         into a tests-any fixture). mounted outside, the walk never reaches it.
 * .note = declapract joins `declarations` onto the config's dir as a string, so the path written is
 *         relative between the two PHYSICAL dirs, and callers must name the config by the returned
 *         physical path (genTempDir hands back a link into /tmp).
 */
export const genTempRepoWithDeclarationsOutside = (input: {
  slug: string;
  clone: string;
  declarations: string;
  symlink: { at: string; to: string }[];
}): string => {
  // the repo to apply into, with no link into src/ for the declarations
  const repo = realpathSync(
    genTempDir({ slug: input.slug, clone: input.clone, symlink: input.symlink }),
  );

  // the declarations mirror, mounted beside the repo, never within it
  const mount = realpathSync(
    genTempDir({
      slug: `${input.slug}-declarations`,
      symlink: [{ at: 'declarations', to: input.declarations }],
    }),
  );

  // point the repo's use.yml at the outside mount
  const configPath = path.join(repo, 'declapract.use.yml');
  const configBefore = readFileSync(configPath, 'utf-8');
  if (!/^declarations:.*$/m.test(configBefore))
    throw new Error(
      `genTempRepoWithDeclarationsOutside: ${input.clone}/declapract.use.yml has no declarations line to repoint`,
    );
  const declarePath = path.relative(
    repo,
    path.join(mount, 'declarations', 'declapract.declare.yml'),
  );
  writeFileSync(
    configPath,
    configBefore.replace(/^declarations:.*$/m, `declarations: '${declarePath}'`),
  );
  return repo;
};
