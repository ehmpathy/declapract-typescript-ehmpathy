---
name: define.invariant.github-environment-set
description: a repo declares exactly four github environments — preparation, production-on-main, production-on-else-apply, production-on-else-plan — because each env NAME is an OIDC trust `sub` anchor that selects which aws role a job may assume; collapsing any two removes a role separation
type: reference
---

# define.invariant.github-environment-set

## .what

every repo's `provision/github.repo/resources.ts` declares **exactly four** github environments,
and no fewer:

| env | anchors | branch policy |
|---|---|---|
| `preparation` | the prep/test deploy gate (repo-scoped oidc, any branch) | none — any branch |
| `production-on-main` | the prod apply from main/tags | main + `v*` tags |
| `production-on-else-apply` | the actor_id-gated WRITER role, from a non-main branch | any branch |
| `production-on-else-plan` | the READONLY plan role, from any branch | any branch |

`production-on-else-apply` and `production-on-else-plan` are **two distinct environments**, never
one. the `access` tier (`test | prep | prod`) rides the separate `access` input and is **not** part
of an env name.

## .kind

**nurture.** github does not force this set — a repo could declare one env, or ten. we chose these
four because each env name is load-bearing at the aws oidc trust layer (below), and each incident
where two were collapsed removed a role separation. to overturn it, show that the oidc trust
condition no longer keys on the env name (see `.what would overturn it`).

## .invariant

```
declared-github-environments(repo) = {
  preparation,
  production-on-main,
  production-on-else-apply,
  production-on-else-plan,
}

∧  production-on-else-apply ≠ production-on-else-plan   # the split is the point
```

## .why

**an env name is the aws oidc trust `sub` anchor.** an aws IAM role a CI job assumes trusts a
`token.actions.githubusercontent.com:sub` condition. for the prod roles that condition names the
github environment:

- `repo:<org>/<repo>:environment:production-on-else-apply` → trusted by the **writer** role
- `repo:<org>/<repo>:environment:production-on-else-plan` → trusted by the **readonly** role

so **the env a job declares is what selects which aws role it may assume.** the writer role is gated
by an aws `actor_id` allowlist (the human gate — github's own required-reviewers is Enterprise-only
and returns 422 for both team and user reviewers on a private repo under the Free/Pro/Team plan). the
readonly role has no such gate because a plan is safe.

collapse `production-on-else-apply` and `production-on-else-plan` into one name and a **plan** job now
satisfies the **writer** role's trust condition — the actor_id human-gate on prod writes is bypassable
by any readonly plan job. that is a security regression, and it is invisible: the collapsed env
type-checks, deploys, and passes every gate.

`preparation` exists for a different reason — the prep oidc role trusts a **repo-scoped** `sub`
(`repo:<org>/*:*`, any repo, any branch, no environment anchor), so a feature branch may deploy to
prep for test. it carries no protection rule; it exists so every deploy job can ALWAYS declare a
github-environment (the gate anchor for `deployment: false`, per
`rule.require.always-declare-github-environment`). one bare `preparation` name is used across every
repo for consistency.

## .scope

this invariant covers the **set of env names** a repo declares and the apply/plan split within it.
it does NOT cover:

- the `access` axis (`test | prep | prod`) — a separate input naming which resources a job reaches;
  a test-access job and a prep-access job both anchor the one `preparation` env
  (`rule.forbid.access-permission-not-place`)
- the branch/tag protection rules each env carries (a separate concern of the env declaration)
- repos that legitimately have no prod deploy at all (they may declare a subset — this invariant
  binds a repo that declares ANY of the production-on-else pair to declare BOTH)

## .the counter-argument

> *"the workflow passes the role ARN it wants directly (`creds-aws-role-arn-plan` vs
> `-apply`), so the env name is redundant — collapse the two and let the ARN select the role."*

this fails because **the ARN a workflow passes is only the REQUEST; the trust policy is what
GRANTS.** the aws role's trust condition keys on the env-name `sub`. if a single env name anchors
both roles' trust, then a plan job that passes the writer ARN is granted the writer role — the trust
layer no longer discriminates. the two-name split is defense-in-depth at the TRUST layer, so a
workflow-layer mistake (passing the wrong ARN) cannot escalate. with one name, only the workflow
author's discipline stops a plan-context job from requesting and receiving the writer role, and
discipline is not a gate.

## .what would overturn it

- the aws oidc trust condition stops keying on the github env name (e.g. keys on the branch ref or a
  custom claim instead) — then the env name is no longer role-selecting, and the split may relax
- github ships required-reviewers on the plan tier (Free/Pro/Team) so the human gate can live on the
  env's protection rule rather than the aws actor_id allowlist — then `production-on-else-apply` may
  fold into `production-on-main`'s policy model
- until one of those holds, the four-env set stands, and the apply/plan split within it is required

## .enforcement

- a repo's `provision/github.repo/resources.ts` that declares fewer than these four env names =
  **blocker**
- `production-on-else-apply` and `production-on-else-plan` collapsed into one env = **blocker**
- clamped by `src/practices/provision-github/github-environment-set.declapract.test.ts` — a
  source-text assertion that reddens on any drop or merge of the four names

## .see also

- `rule.require.github-environment-from-declared-allowlist` — every caller value must name one of
  these declared envs (github silently mints an ungated, oidc-less env otherwise)
- `rule.require.always-declare-github-environment` — why `preparation` must exist (the always-declare
  gate anchor)
- `rule.forbid.access-permission-not-place` — the `access` axis is separate from the env name
- `src/practices/provision-github/best-practice/provision/github.repo/resources.ts` — the declaration
