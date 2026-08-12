import { FileCheckType } from 'declapract';

/**
 * .what = pins `packageManager` to an EXACT pnpm version (`pnpm@10.31.7`), not a minVersion.
 * .why  = this is an intentional org-standardization REQUIREMENT, not an oversight. every pnpm
 *         consumer runs ONE blessed pnpm version, so `corepack` / `pnpm/action-setup@v4` load the
 *         identical toolchain across CI, local, and every repo — reproducible installs, no per-repo
 *         drift. an exact pin is also the ONLY correct shape here: the `packageManager` field is a
 *         corepack spec that requires the `pnpm@<version>` prefix, which declapract's bare-semver
 *         `check.minVersion(..)` cannot emit.
 * .note = a consumer ahead of the pin (e.g. on 10.32.1) is pinned BACK to the blessed version on
 *         `declapract fix` — that convergence-to-one-version is the intent, not a regression. when
 *         the org bumps the blessed version, this pin bumps and every consumer follows.
 */
export const check = FileCheckType.CONTAINS;
