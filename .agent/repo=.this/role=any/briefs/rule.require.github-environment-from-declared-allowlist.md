---
name: rule.require.github-environment-from-declared-allowlist
description: a github-environment value passed to a reusable workflow must name an environment declared in provision/github.repo/resources.ts (the allowlist that carries the oidc attachment) — never a bare tier word
type: rule
---

# rule.require.github-environment-from-declared-allowlist

## .what

every `github-environment-plan` / `github-environment-apply` value a caller passes to a reusable
workflow must name an environment **declared in that repo's own `provision/github.repo/resources.ts`**.
that declastruct wish enumerates the **only** github environments the repo has — the allowlist — and
each declared environment carries the oidc trust attachment plus its branch/tag protection ruleset.

a value absent from that enumeration is forbidden. the sharpest case is a **bare tier word**
(`prep`, `prod`, `test`), which names no declared environment.

## .why

- **only a declared environment carries the oidc attachment.** the oidc role trust and the
  branch/tag protection ruleset attach to a SPECIFIC named environment in
  `provision/github.repo/resources.ts`. a `github-environment` value that matches no declaration
  resolves to no gate and no oidc claim — so the job either assumes no role (the deploy fails) or
  runs ungated. both faults are silent: github mints an ad-hoc environment on first reference
  rather than error, so a typo'd or bare name looks live and is not.

  > verbatim, from the human who owns this:
  > - *"only those have the oidc attachments"*
  > - *"the github provision within repo enumerates the only envs that are allowlisted for use"*

- **one env, one name.** `prod` and `production-on-main` are two words for one environment — the
  synonym drift `rule.forbid.stage-term` and `rule.forbid.access-permission-not-place` already
  forbid, one layer up. the allowlist admits one name; a bare synonym is a second.

## .the declared shape

a repo declares **exactly four** environments. one bare `preparation` name serves every prep/test
deploy (the access tier rides the separate `access` input, never the env name); the three
`production-*` names use a `production-on-<ref-policy>` shape, so the name states the ref policy it
gates on:

| environment | access | fires on | used by |
|---|---|---|---|
| `preparation` | prep, test | any branch | every prep/test deploy |
| `production-on-main` | prod | main / tags | prod apply |
| `production-on-else-apply` | prod | non-main (actor_id-gated) | prod apply from a non-main branch |
| `production-on-else-plan` | prod | non-main (PR plan) | prod plan |

the `production-on-else-apply` / `production-on-else-plan` pair is **two distinct envs, never
merged** — each env name is the oidc trust `sub` anchor that selects the WRITER vs the READONLY
role. see `define.invariant.github-environment-set` for why the four-env set is exactly this, and
`rule.forbid.access-permission-not-place` for why the access tier is not part of the env name.

## .the forbidden shapes

| 👎 forbidden | 👍 canonical | why |
|---|---|---|
| `github-environment-apply: prep` | `github-environment-apply: preparation` | bare `prep` names no declared env |
| `github-environment-apply: prep-on-main` | `github-environment-apply: preparation` | `prep-on-main` is retired — one bare `preparation` name across every repo |
| `github-environment-plan: prod` | `github-environment-plan: production-on-else-plan` | bare `prod` names no declared env |
| `github-environment-apply: prod` | `github-environment-apply: production-on-main` | `prod` ≠ the declared `production-on-main` |
| `github-environment-*: test` | `github-environment-*: preparation` | bare `test` names no declared env; test rides `preparation` + `access: test` |
| `github-environment-*: production-on-else` | the `-apply` or `-plan` name | the merged name drops a role separation (`define.invariant.github-environment-set`) |
| any value not in `provision/github.repo/resources.ts` | a value the wish declares | the wish is the allowlist |

## .the test

for every `github-environment-plan` / `github-environment-apply` value a caller passes:

> "is this value one of the environments declared in `provision/github.repo/resources.ts`?"

- yes → correct
- no → **blocker**. github will silently mint an ungated, oidc-less environment for it

## .enforcement

- a `github-environment-*` value that names no environment declared in
  `provision/github.repo/resources.ts` = **blocker**
- a bare tier word (`prep`, `prod`, `test`) as a `github-environment-*` value = **blocker**
- two `github-environment-*` values for one environment that disagree on the name
  (`prod` and `production-on-main`) = **blocker**
- a caller and its declared allowlist that genuinely agree on every name = **false positive** (allowed)

## .see also

- `define.invariant.github-environment-set` — why the declared set is exactly these four, and why
  the `production-on-else` apply/plan pair must never merge
- `rule.require.always-declare-github-environment` — the paired rule: ALWAYS declare one (never omit
  for prep); `deployment: false` keeps the gate and suppresses the timeline spam
- `rule.forbid.access-permission-not-place` — the kin synonym forbid (one word per concept)
- `rule.forbid.stage-term` — the kin axis forbid (`access`, never a divergent `stage`)
- `define.declastruct-goforward` — how `provision/github.repo/resources.ts` declares repo settings
