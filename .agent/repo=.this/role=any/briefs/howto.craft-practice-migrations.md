# howto: craft migrations between practices

## .what

a **migration** moves a concern from one practice to another — e.g. "SSM params are
owned by terraform" → "SSM params are owned by declastruct-aws". declapract can drive
the whole migration for a consumer: generate the new owner, cross-check coverage, and
safely retire the old owner. this brief shows the depth available.

## .why

a `.declapract.ts` check/fix is **a real typescript function**, not a static
template. it gets the project root in context, so it can read any file in the
consumer repo, compute, and emit code. that unlocks migrations that look impossible
at first glance ("a fix can only touch its own file"). the trick is to split the
migration across a **best-practice** and a **bad-practice** that cooperate.

## .the two capabilities that unlock it

### 1. check/fix are full ts functions

```ts
export const check: FileCheckFunction = (contents, context) => { /* throw = violated */ };
export const fix:   FileFixFunction   = (contents, context) => ({ contents: '...' });
```

they can `import { readFileSync } from 'fs'`, run regexes, generate code — anything.

### 2. `context` sees the whole project

`FileCheckContext` (from declapract) carries more than the file under check:

| field | use |
| ----- | --- |
| `getProjectRootDirectory()` | read ANY neighbor file in the consumer repo |
| `declaredFileContents` | the template with `@declapract{variable.*}` ALREADY substituted to the consumer's values — the correct base to generate from |
| `projectVariables` | the raw substituted variables |
| `relativeFilePath` | the file's path — a fix can relocate a file by return of a different `relativeFilePath` |

**do not emit `@declapract{variable.*}` from a fix** — that literal would land in the
consumer's file. generate from `contents ?? declaredFileContents` (already substituted).

## .the migration pattern

pair two practices, one on each side of the handoff:

```
best-practice/  → ADDS the new owner (declares the go-forward ownership)
bad-practice/   → REMOVES the old owner, safely
```

### best-practice = static go-forward owner (prefer this)

- ship a plain template of the new owner (e.g. a declastruct wish) that declares the
  go-forward names directly. NO generator, NO codegen — a static file the consumer's
  `@declapract{variable.*}` substitution fills in.
- design the owner for **adoption by absence**: a fresh plan reports KEEP for a live
  resource it did not create. e.g. a value-less `DeclaredAwsSsmParameterSecure` adopts
  the live value the old owner seeded — it never reads or rewrites it (metadata-only
  KEEP). there is no value to move, so there is no seed/backfill machinery to write.
- the go-forward name set is small and known, so state it directly. do NOT reach for a
  generator to derive it from the old source — that couples the two files and adds a
  codegen surface you do not need.

### best-practice = generator + coverage check (advanced, only if the set is large/unknown)

if the go-forward set is large or churns per-consumer, a fix CAN derive it from the old
source instead of a hardcode:

- `fix`: read the old source via `getProjectRootDirectory()`, extract what it owns,
  **union** it into a machine-editable list, rewrite ONLY the list (no wipe → idempotent).
- `check`: throw while the new owner does not cover all the old source still
  declares — the safety gate that blocks retirement of the old owner before coverage is
  total.

prefer the static owner. reach for the generator only when a hardcode is genuinely
unmaintainable — it is the higher-cost path.

### bad-practice = safe remover

- `check`: return (detected) while the old source still owns the concern; throw
  (skip) once it does not — so an already-migrated repo is a no-op.
- `fix`: transform the old source. for stateful external resources, **forget, do not
  destroy** (see safety below).

## .safety rules for stateful resources

when the concern is a live resource (an SSM secret, a dns record, a db), a naive
"delete the old declaration" can destroy the real thing. rules:

- **forget, not destroy.** terraform: rewrite `resource {...}` into
  `removed { from = ...  lifecycle { destroy = false } }` (terraform >= 1.7) rather
  than a delete. the resource leaves state; the live value stays.
- **cover before you forget.** the new owner must declare every go-forward name before
  the bad-practice forget lands. document the order in a readme so the consumer declares
  the wish first, then forgets the terraform second.
- **idempotent + no re-match.** the forget-rewrite regex targets the OLD shape
  (`resource "aws_ssm_parameter"`), which its own `removed{}` output does not contain →
  a second pass is a no-op. re-runs are safe.
- **adopt by absence.** design the new owner so a fresh plan reports KEEP for a live
  resource it did not create (e.g. a write-only secret whose value is unset = keep). the
  live value the old owner seeded stays untouched — no seed, no move, no backfill.

## .what declapract can and cannot do

| can | cannot |
| --- | ------ |
| declare the new owner (static, or generated from the old source) | run the live `apply` (a human gates that) |
| cross-check coverage across files | sequence live infra steps |
| forget-rewrite the old source | know a secret's value (write-only = keep) |

codegen + static verification is the ceiling; the live apply stays a gated human step.
put that runbook in a readme next to the generated owner.

## .worked example (in this repo)

the SSM-off-terraform migration:

- best-practice `persist-with-rds/best-practice/provision/aws/resources.parameters.ts`
  — a STATIC wish that declares each secret as a value-less
  `DeclaredAwsSsmParameterSecure` (write-only KEEP). no generator: the go-forward names
  are stated directly and adopted by absence, so a fresh plan KEEPs every live param the
  terraform seeded.
- bad-practice `persist-with-rds/bad-practices/terraform-parameters/…/parameter-store.tf.declapract.ts`
  — the fix rewrites each `resource "aws_ssm_parameter"` into a `removed{}` forget
  block and drops the `data` seed-reads.
- readme next to the wish carries the order-of-operations + the 🚩 `DeleteParameter`
  stop-sign.

## .testing cross-file checks

mock the context; build a throwaway root with `mkdtempSync`:

```ts
const genContextForRoot = (root: string, declaredFileContents: string | null = null) =>
  ({ getProjectRootDirectory: () => root, declaredFileContents }) as any;
```

write the old source into `root/<path>` with `writeFileSync`, then assert the
bad-practice check detects the old owner, the fix forgets each resource, a second pass
is a no-op, and (for the advanced generator variant) the check throws on gaps and the
fix unions without a wipe.

## .checklist

- [ ] best-practice ships the new owner (static wish, adopted by absence — prefer this)
- [ ] the new owner needs no seed/move: a value-less write-only secret KEEPs the live value
- [ ] bad-practice detects the old owner (return) and skips once gone (throw)
- [ ] bad-practice fix forgets, does not destroy, stateful resources
- [ ] the forget-rewrite regex cannot re-match its own output (idempotent)
- [ ] readme documents the order (wish first, forget second) + the live-apply gate
- [ ] tests cover: detected → forget, second pass → no-op, before/after snapshots
- [ ] (generator variant only) tests cover: gap → throw, covered → pass, fix → union
