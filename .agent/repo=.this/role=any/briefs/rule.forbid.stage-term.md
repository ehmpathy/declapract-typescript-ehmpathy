---
name: rule.forbid.stage-term
description: the ambiguous term `stage` is banned everywhere except literally scoped within an external-party adapter (serverless `--stage`); canonical = `access`
type: rule
---

# rule.forbid.stage-term

## .what

the term **`stage`** is forbidden — as an input name, a variable, a config key, a workflow field,
a comment, a resource-name token, anywhere a contract or a template can carry it. the one canonical
word for *which deployment tier a runtime reaches or a resource belongs to* is **`access`**
(`test | prep | prod`).

two exceptions, and only two:

1. the literal flag an external-party tool demands, scoped WITHIN that tool's adapter — today that
   is serverless framework's `--stage`, pinned `--stage ${access}`, never lifted out of the sls
   invocation into our own code.
2. the **dual-publish transition scaffold** — the one contained `accessByStage` /
   `deploymentBucketByStage` adapter in the serverless template, whose sole job is to publish the
   ancient `-dev-` fleet beside the contemp `-prep-` fleet through the north-star transition. see
   `.the second allowed use` below for why this narrow, self-retired divergence does not reopen the
   silent-fault class the rule exists to kill.

## .why

`stage` and `access` named ONE fact — which deployment — with TWO words that disagree
(`access=prep ⟺ stage=dev`). both type as `string`, so a wrong-axis reference is
**compiler-invisible**: green at build, red only at runtime, against a deployed resource. that is
the worst fault class there is — no gate sees it. the north star of this repo is to **retire the
`stage` axis entirely** so the wrong-axis reference is not even expressible, because there is no
second axis to reach for.

so this is not a style preference. every `stage` that survives is a live re-entry point for the
exact silent fault the whole `fix-lambdas` line of work exists to delete.

## .the one allowed use

```yaml
# INSIDE the serverless invocation ONLY — the tool demands the field, pinned to access:
- run: npm run deploy -- --stage ${ACCESS}   # sls's own flag, = access, never divergent
```

`--stage ${access}` is the floor serverless imposes; it is the adapter boundary, and the word dies
the moment it leaves that invocation.

## .the second allowed use

the north star retires `stage` by collapsing two names onto one — but a collapse cannot be a
flag-day. serverless names one CloudFormation stack per `--stage` slug, so a service that publishes
under two names (`svc-x-dev-*` beside `svc-x-prep-*`) is two stacks, which is two slugs, one of
which (`dev`) diverges from access (`prep`) for exactly as long as the transition runs. that
divergence is not the silent-fault re-entry point this rule exists to kill, for three reasons:

1. **it is CONTAINED to two map declarations.** `accessByStage` resolves ONE value —
   `${self:custom.access}` — and every resource ARN in the template keys off that resolved
   `access`, never off `${provider.stage}`. so the divergence lives in the adapter that answers
   serverless's `--stage` demand, and does not leak into a single resource name a caller reaches by
   access. `deploymentBucketByStage` is the same shape for the account-scoped deploy bucket.
2. **the fleet is a set of ALIASES, not copies.** dual-publish points two lambda names at one
   service; a cross-service caller reaches the ancient `-dev-` name through the `Ancient` helper so
   no call 404s while the org migrates peer-by-peer. `grep AccessAncient` is the live migration
   ledger.
3. **it is TIME-BOXED and self-retiring.** at the endpoint (`grep AccessAncient → 0` org-wide) the
   `-dev-` publish, the `Ancient` helper, `accessByStage`, and `deploymentBucketByStage` retire
   together in one move. the scaffold announces its own teardown.

so the sanctioned scaffold is the serverless-`--stage` adapter of exception 1, seen at the two-stack
grain: the `accessByStage`/`deploymentBucketByStage` maps ARE the pinning of `--stage` to access
across the transition's two slugs. a divergent `stage` value ANYWHERE ELSE — a resource ARN keyed on
`${provider.stage}`, an `accessByStage` remap outside this template, a scaffold kept past the
endpoint — remains a **blocker**.

## .the forbidden shapes

| 👎 forbidden | 👍 canonical |
|---|---|
| a workflow input `stage:` | `access:` |
| `inputs.stage` / `github.event.inputs.stage` | `inputs.access` / `github.event.inputs.access` |
| `ACCESS=${{ inputs.stage }}` | `ACCESS=${{ inputs.access }}` |
| a comment "the stage to deploy to", "stage is not prep" | "access …", "access is not prep" |
| a resource name keyed by `${self:provider.stage}` where access is meant | keyed by access |
| an `accessByStage` remap OUTSIDE the sanctioned serverless scaffold | no remap — one axis (the scaffold is exception 2) |
| an `import { stage }` / `export const stage` in app code | `access` / `envStatic.access` |

## .the test

"is this `stage` the literal serverless `--stage` flag, inside the sls invocation?"

- yes → allowed, pinned `= access`
- no → **blocker**. rename to `access`

## .enforcement

- any `stage` outside the two allowed uses (the literal sls-`--stage` adapter, or the dual-publish
  scaffold of exception 2) = **blocker**
- a resource-name token, config key, or workflow input keyed on `stage` = **blocker**
- a `stage`-axis value that diverges from `access` — an `accessByStage` remap outside the sanctioned
  serverless scaffold, or the scaffold kept past the `grep AccessAncient → 0` endpoint = **blocker**

## .see also

- `rule.require.always-declare-github-environment.md` — the paired deploy-workflow rule
- `define.sdk-environment-shape.md` — `access` is the org-canonical tier term
- `prefer.env_access.prep_over_dev.md` (architect) — why `prep`/`prod`, not `dev`
