---
name: rule.require.always-declare-github-environment
description: a deploy job ALWAYS declares its github-environment (never omit for prep); `deployment: false` suppresses the timeline spam while it keeps the gate
type: rule
---

# rule.require.always-declare-github-environment

## .what

every deploy job declares a `github-environment` — for **prep AND prod alike**. a deploy workflow
must never omit the environment for prep, and its input description must never say "prod only" or
"omit for prep".

the environment carries `deployment: false`, so the built-in gate stays (required reviewers,
branch/tag policy, oidc claim) while the auto-Deployment is suppressed — no "deployed to <env>"
status accretes on the PR timeline.

## .why

a github-environment gives a deploy job its guardrails: required reviewers, branch/tag protection
rules, and a clean oidc env claim. every deploy tier wants those guardrails — prep no less than
prod — so every deploy job declares an environment.

the one cost a plain declaration carries is timeline noise: a bare github-environment sprays a
GitHub Deployment tracker onto every PR timeline. `deployment: false` removes exactly that cost —
it keeps the gate and stops the Deployment tracker from the outset.

so the two properties are independent, and the environment claims both:

- **the gate** — the `name:` declares the environment, so reviewers/protection/oidc-claim apply
- **the quiet** — `deployment: false` suppresses the PR-timeline Deployment

no tier wants its gate dropped, so no tier omits the environment. `deployment: false` is what makes
an always-present environment free of noise.

## .the shape

```yaml
# the reusable deploy job:
environment:
  name: ${{ inputs.github-environment-apply }}
  # deployment: false — keep the gate (reviewers, oidc claim), suppress the PR-timeline Deployment
```

```yaml
# the caller ALWAYS passes it — for prep AND prod:
with:
  access: prep
  github-environment-apply: preparation
# and:
  access: prod
  github-environment-apply: production-on-main
```

the input description states the always-declare contract — never "prod only; omit for prep":

```yaml
github-environment-apply:
  type: string
  description: "github environment for the apply job"
```

## .the test

"does this deploy job declare a github-environment, for prep as well as prod?"

- yes, with `deployment: false` → correct
- no, omitted for prep → **blocker**
- description says "prod only" / "omit for prep" → **blocker** (an environment is owed for every tier)

## .enforcement

- a deploy job that omits github-environment for prep = **blocker**
- an input description that says "prod only" or "omit for prep" = **blocker**
- a github-environment declared WITHOUT `deployment: false` (so the timeline spam returns) = **blocker**

## .see also

- `rule.require.github-environment-from-declared-allowlist` — the caller value must name a declared env; `preparation` is the one declared for every prep/test deploy
- `define.invariant.github-environment-set` — the four-env register `preparation` belongs to
- `rule.forbid.stage-term.md` — the paired deploy-workflow rule (the axis this workflow keys on is `access`, never `stage`)
