# howto: pnpm + expo — the hoisted linker and its transitive-skew gotcha

## .what

`node-linker=hoisted` gives a pnpm expo / react-native repo a **flat** `node_modules`. it is the
default `create-expo-app` itself ships for pnpm, and the documented **fallback** when isolated
installs cause native-resolution errors. this brief records WHEN a repo wants it, the exact `.npmrc`
block, and the one gotcha the flat layout introduces — transitive version skew — so the next expo
repo does not re-derive it (as `ahbode/app-hometools-native` did by hand in its pnpm migration).

## .the SDK 54 nuance — hoisted is the default+fallback, NOT a hard requirement

read this FIRST, so the brief does not overclaim. per the official expo docs
(docs.expo.dev/guides/monorepos):

- **SDK 54+ supports isolated installs**, and isolated is pnpm's own default install strategy. it
  works for most modern packages.
- **`create-expo-app` still defaults `node-linker=hoisted`** for pnpm, so a fresh expo repo ships
  with the hoisted linker unless the author removes it.
- **hoisted is documented as the FALLBACK**: *"if you encounter issues with isolated installations
  with pnpm, switch to the hoisted installation strategy."*

so, stated accurately: hoisted is the well-trodden, create-expo-app-default layout, and the
guaranteed-to-work fallback for the native-resolution errors that isolated installs can still cause
on metro / react-native / EAS. it is NOT "the only way an expo repo can run". a repo on SDK 54+ that
prefers pnpm's modern isolated default can drop the `node-linker=hoisted` line and keep isolated.

## .why hoisted resolves native-module lookup

pnpm's isolated (symlinked) store puts each package's dependencies in a global content-addressed
store and symlinks them into a nested `node_modules`. metro / react-native / EAS historically look
up native modules by a walk of a **flat** `node_modules` tree and do not follow pnpm's symlink
layout — the failure mode hoisted forecloses:

```ini
# create-expo-app's default for pnpm: a flat node_modules (hoisted linker).
# the fallback when isolated installs break metro/react-native native-module lookup.
node-linker=hoisted
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=*react-native*
public-hoist-pattern[]=@react-native/*
public-hoist-pattern[]=metro*
public-hoist-pattern[]=*metro-*
```

- `node-linker=hoisted` — flatten `node_modules` (npm/yarn-classic layout) instead of the isolated
  symlinked store.
- `public-hoist-pattern[]` — force these package families to the ROOT `node_modules`, so metro's
  flat walk finds them regardless of which transitive dep pulled them.

**where it lives in declapract:** the `node` practice's `.npmrc` is usecase-aware — it findserts this
block when `context.projectPractices.includes('cicd-app-react-native-expo')`
(`src/practices/node/best-practice/.npmrc.declapract.ts`). so an expo repo gets it via
`declapract fix`; a node repo gets the base `.npmrc` unchanged. (per `rule.avoid.runtime-forks`: one
usecase-aware practice, not a fork.)

the declaration is a FINDSERT (a `check`/`fix` union via `defineExpectedNpmrcContents`), not an
EQUALS overwrite. the fix only APPENDS absent declared lines and never removes one, so a narrow
`declapract fix --practice node` on an expo repo — where the expo signal goes dark
(`projectPractices === ['node']`) — leaves a correctly-hoisted `.npmrc` intact rather than reverts it
to base. the scope-safety is by construction; no whole-usecase caveat is needed. clamped by
`.npmrc.declapract.integration.test.ts` `[case2]` (the narrow-scope apply is a no-op on a hoisted
file) and by `.npmrc.declapract.test.ts`.

**the default this practice sets matches create-expo-app's own default** — a fresh pnpm expo repo
ships with `node-linker=hoisted`, so the findsert delivers the same layout the expo tooling already
picks, and it never removes an isolated setting a consumer added by hand (append-only). the OPEN
design call it leaves for the wisher: on SDK 54+ isolated is pnpm's faster default and works for
most packages, so forcing hoisted on every expo consumer nudges a repo off the modern default it
might prefer. if the wisher wants isolated-first, the clean rework is to flip the `.npmrc` hoist from
a forced findsert into a bad-practice DETECT-and-offer (surface the hoist as a documented remedy
only when a repo hits native-resolution errors), keeping the block + this brief for the repos that
need it. flagged, not decided — the current forced findsert stands until the wisher rules.

## .the gotcha — the flat linker EXPOSES transitive version skew

a symlinked store isolates each package's dependency versions. a **flat** `node_modules` cannot —
only one version of a given package can sit at the root, so a mismatched transitive version can
**hoist over** the version an intended consumer needs. symptoms seen in the wild
(`app-hometools-native`):

- `@commitlint/format` "is not a function" — a wrong `@commitlint/*` version hoisted to root
- `type-fns` "Class extends value undefined" — a stale `type-fns` pulled by `whodis-react` hoisted
  over the intended one

**the fix pattern (liftable): pin the skewed transitive with `overrides`.** in pnpm, that is
`pnpm.overrides` in `package.json`:

```jsonc
{
  "pnpm": {
    "overrides": {
      "type-fns": "1.x.x",           // pin the version metro/your code needs
      "@commitlint/format": "19.x.x"
    }
  }
}
```

## .what is liftable vs repo-specific

| liftable into declapract | NOT liftable (repo-specific) |
|--------------------------|------------------------------|
| the `node-linker=hoisted` + `public-hoist-pattern[]` block (identical for every expo repo) | the specific `overrides` VERSIONS (driven by each repo's own dep tree) |
| the KNOWLEDGE that the flat linker exposes skew, and the `overrides` fix pattern (this brief) | which packages skew (differs per repo) |

so declapract ships the `.npmrc` block + this brief; each repo authors its own `overrides` versions
when a skew symptom appears. do NOT hardcode version pins into the practice — they would be wrong for
the next repo.

## .the npm → pnpm `overrides` relocation

a repo migrating from npm/yarn carries dep pins under a top-level `overrides` (npm) or `resolutions`
(yarn) key. pnpm reads NEITHER — it reads `pnpm.overrides`. a migration MUST relocate them, or the
pins silently stop applying and the skew returns. (the `app-protools-native` migration handles this
as a `package.json` contains-merge: `overrides` / `resolutions` → `pnpm.overrides`.)

## .see also

- `src/practices/node/best-practice/.npmrc.declapract.ts` — the usecase-aware `.npmrc` declaration
- `rule.avoid.runtime-forks` — why the hoist is a usecase-aware branch, not a fork
- `howto.craft-practice-migrations` — the npm→pnpm migration shape that relocates `overrides`
