import { FileCheckType } from 'declapract';

/**
 * .what = pins `packageManager` to an EXACT pnpm version (`pnpm@10.34.5`), not a minVersion.
 * .why  = this is an intentional org-standardization REQUIREMENT, not an oversight. every pnpm
 *         consumer runs ONE blessed pnpm version, so `corepack` / `pnpm/action-setup@v4` load the
 *         identical toolchain across CI, local, and every repo — reproducible installs, no per-repo
 *         drift. an exact pin is also the ONLY correct shape here: the `packageManager` field is a
 *         corepack spec that requires the `pnpm@<version>` prefix, which declapract's bare-semver
 *         `check.minVersion(..)` cannot emit. the pin's major stays v10 by hard rule — see
 *         `.agent/repo=.this/role=any/briefs/rule.require.pnpm-major-v10.md` (v11 inverts the
 *         build-allowlist model the peer practices encode).
 * .note = a consumer ahead of the pin (e.g. on 10.32.1) is pinned BACK to the blessed version on
 *         `declapract fix` — that convergence-to-one-version is the intent, not a regression. when
 *         the org bumps the blessed version, this pin bumps and every consumer follows.
 * .what = also declares `pnpm.allowUnusedPatches` + `pnpm.ignorePatchFailures` (#680).
 * .why  = a patch pins one exact version; the next upgrade orphans it, and pnpm then refuses the
 *         whole install (`ERR_PNPM_UNUSED_PATCH`, `ERR_PNPM_PATCH_FAILED`). both keys turn that
 *         refusal into a warn, so patch-then-upgrade never halts an install. a repo with no patch
 *         gets them too, so its first patch is already safe to upgrade past. the CONTAINS fix
 *         deep-merges, so a repo's other `pnpm.*` keys (overrides, patchedDependencies, the build
 *         allowlist) are kept.
 */
export const check = FileCheckType.CONTAINS;
