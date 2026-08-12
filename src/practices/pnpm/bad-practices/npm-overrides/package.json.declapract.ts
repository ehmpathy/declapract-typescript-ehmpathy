import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { ConstraintError } from 'helpful-errors';

/**
 * .what = detects a top-level `overrides` (npm) or `resolutions` (yarn) key in package.json
 * .why  = pnpm reads NEITHER — it reads `pnpm.overrides`. a repo migrated to pnpm that keeps
 *         its pins under the npm/yarn keys silently loses them, which lets a mismatched
 *         transitive version hoist over the intended one (the flat-linker skew hazard). see
 *         `.agent/repo=.this/role=any/briefs/howto.pnpm-expo-hoisted-linker.md`.
 */
export const check: FileCheckFunction = (contents) => {
  const packageJSON = JSON.parse(contents ?? '{}');

  // detected (bad practice) when either npm-`overrides` or yarn-`resolutions` sits at top level
  if (
    packageJSON.overrides !== undefined ||
    packageJSON.resolutions !== undefined
  )
    return;

  // not detected — already pnpm-shaped (or no pins at all)
  throw new Error('does not match bad practice');
};

/**
 * .what = relocates top-level `overrides` + `resolutions` into `pnpm.overrides`, then drops them
 * .why  = pnpm reads only `pnpm.overrides`. precedence on a key conflict: npm `overrides` wins over
 *         yarn `resolutions` over any pre-extant `pnpm.overrides`.
 *
 * .note = handles the FLAT override shape (`{ "pkg": "1.2.3" }`). npm ALSO supports a NESTED
 *         per-dependency form (`{ "foo": { ".": "1.0.0", "bar": "2.0.0" } }`) that pnpm's flat-only
 *         `pnpm.overrides` cannot express. this fix does NOT silently emit such a shape (a config
 *         pnpm rejects — a failhide); it FAILS FAST with a `ConstraintError` that names the at-fault
 *         key and the fix, per `rule.forbid.failhide` / `rule.require.failfast`. a consumer with
 *         nested npm overrides must flatten them by hand.
 */
export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };
  const packageJSON = JSON.parse(contents);

  // merge — npm `overrides` beats yarn `resolutions` beats any extant `pnpm.overrides`
  const mergedOverrides = {
    ...(packageJSON.pnpm?.overrides ?? {}),
    ...(packageJSON.resolutions ?? {}),
    ...(packageJSON.overrides ?? {}),
  };

  // fail fast on a nested per-dependency override — pnpm's flat `pnpm.overrides` cannot express it,
  // so a pass-through would emit a config pnpm rejects (a silent failhide). name the fix.
  const nestedKeys = Object.entries(mergedOverrides)
    .filter(([, value]) => typeof value !== 'string')
    .map(([key]) => key);
  if (nestedKeys.length)
    throw new ConstraintError(
      'cannot migrate a NESTED npm override to pnpm — flatten it by hand first',
      {
        nestedKeys,
        hint: `pnpm's \`pnpm.overrides\` is flat-only ({ "pkg": "1.2.3" }). the nested per-dependency form ({ ".": "...", "dep": "..." }) has no pnpm equivalent. flatten these keys to a single version string each, then re-run: ${nestedKeys.join(', ')}`,
      },
    );

  // exclude the npm/yarn keys via destructure (no in-place delete), keep every other key
  const {
    overrides: _npmOverrides,
    resolutions: _yarnResolutions,
    ...packageJSONRest
  } = packageJSON;

  const updatedPackageJSON = {
    ...packageJSONRest,
    pnpm: { ...(packageJSON.pnpm ?? {}), overrides: mergedOverrides },
  };

  return { contents: `${JSON.stringify(updatedPackageJSON, null, 2)}\n` };
};
