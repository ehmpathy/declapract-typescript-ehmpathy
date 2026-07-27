# rule.require.declapract-integration-tests

## .what

a `.declapract.ts` fix with **logic** — one that generates, transforms, relocates, or
reads a neighbor file — must have an end-to-end `.declapract.integration.test.ts` that
runs the REAL declapract pipeline (`executeApply`) against a `genTempDir` clone of a
demo consumer repo, and both:

1. **asserts** the resulting files on disk (targeted `expect(...).toContain/not`), and
2. **snapshots** the full before AND after contents of every file the fix touches.

a unit test of the exported `fix`/`check` alone is necessary but NOT sufficient.

## .why

unit tests prove your function's logic in isolation. they do NOT prove that
**declapract wires it up**:

- the file's declared path actually matches the target file,
- `@declapract{variable.*}` substitution feeds the right `declaredFileContents`,
- an absent best-practice file is CREATED by the fix (not skipped),
- a throwing `check` gates the `fix` (best-practice) or a returning `check` triggers
  it (bad-practice),
- a `practice` / `file` filter scopes the apply as you expect.

every one of those is real wiring a mocked-context unit test cannot exercise. bugs
hide there. the integration test is the only proof the consumer's `declapract fix`
produces the end-state you claim.

## .when required

| fix does… | unit test | integration test |
| --------- | --------- | ---------------- |
| trivial value swap / key delete | ✅ | optional |
| generate a file from another source | ✅ | **required** |
| read a neighbor via `getProjectRootDirectory()` | ✅ | **required** |
| relocate a file (`relativeFilePath`) | ✅ | **required** |
| transform blocks (regex over structured text) | ✅ | **required** |
| a migration pair (best-practice + bad-practice) | ✅ | **required** |

## .snapshot the full contents, exhaustively

targeted `.toContain` proves a fact; a full-content snapshot proves the WHOLE file and
gives reviewers a diff to eyeball. do both. per `rule.require.snapshots`:

- snapshot the **before** contents of each input file (so the diff is legible),
- snapshot the **after** contents of each file the fix produced or rewrote,
- keep the targeted assertions too — they state the intent; the snapshot catches the
  unintended.

```ts
then('before + after of the terraform file match snapshot', async () => {
  expect(beforeTf).toMatchSnapshot('parameter-store.tf — before');
  expect(afterTf).toMatchSnapshot('parameter-store.tf — after');
});
```

a snapshot ALONE is not enough (a reviewer may bless a wrong diff); an assertion ALONE
is not enough (it checks only the substrings you thought of). require both.

## .how

model the repo's extant `.declapract.integration.test.ts` files. the shape:

```ts
import fs from 'fs/promises';
import path from 'node:path';
import { executeApply } from 'declapract';
import { genTempDir, given, then, useThen, when } from 'test-fns';

const tempDir = genTempDir({
  slug: 'declapract-<name>',
  clone: './src/practices/<practice>/bad-practices/<name>/.test/assets/<demo-repo>',
  symlink: [{ at: 'src', to: 'src' }], // the demo repo resolves practices from THIS repo's src
});

useThen('fix is applied', async () => {
  await executeApply({
    config: path.join(tempDir, 'declapract.use.yml'),
    practice: '<practice>',
    file: '<relative/path/to/target>', // scope the apply to one file
  });
});

then('the file on disk is as claimed', async () => {
  const out = await fs.readFile(path.join(tempDir, '<relative/path>'), 'utf-8');
  expect(out).toContain('<the proof>');
  expect(out).toMatchSnapshot('<relative/path> — after');
});
```

### the demo-repo fixture (under `<name>/.test/assets/<demo-repo>/`)

- `declapract.declare.yml` → `declare: { practices: src/practices, use-cases: src/useCases.yml, examples: src/examples }`
- `declapract.use.yml` → `declarations: './'`, `useCase: <a useCase that includes the practice>`, and **every variable the practice references** under `variables:`
- `package.json` → minimal `{ "name": "test-project", "version": "1.0.0" }`
- the input file(s) the fix acts on (e.g. the pre-migration `parameter-store.tf`)

### assert the end-state, not the call

read the produced file and assert both the presence of the new shape AND the absence
of the old — e.g. for a migration: the new owner covers every item, and the old
declaration is gone (no `resource "…"` left, only `removed{}` forget blocks). also
assert no `@declapract{` leaked into the output.

## .gotchas

- **whole-practice evaluation.** `executeApply({ practice })` evaluates the ENTIRE
  practice before the `file` filter narrows what to apply. so `declapract.use.yml`
  must define EVERY `@declapract{variable.*}` that ANY file in the practice
  references, or evaluation throws `Variable … was not defined`. grep the practice's
  best-practice dir for `variable\.` to enumerate them.
- **scope with `file`.** to prove one fix without the noise of the whole practice,
  pass `file: '<relative path>'` — apply narrows to that file, evaluation still needs
  all vars.
- **shared tempDir across `when`s.** declare `genTempDir` at the `given` level so
  sequential `when` blocks compose (e.g. generate the new owner in `[t0]`, then forget
  the old one in `[t1]`) against the same repo as it mutates step to step.
- **`src` MUST be loop-free — no self-referential symlinks under `src/practices`.** the
  blessed `symlink: [{ at: 'src', to: 'src' }]` mounts THIS repo's real `src` into the
  temp dir, and `executeApply` deep-walks `src/practices/**` through symlinks. a test
  fixture that symlinks back to an ancestor it lives under (e.g. a
  `.../declarations/practices/<p> -> ../../../..` that resolves to the `<p>` practice
  root the fixture sits inside) forms a cycle → `ELOOP: too many symbolic links` under
  full-suite load (nondeterministic; declapract's realpath-dedup can lose the race). keep
  such fixtures OUTSIDE `src/practices` (repo-root `test/assets/…`, not under `src` —
  tsconfig includes `src/**/*.declapract.ts` and would double-compile a `.declapract.ts`
  reached via a symlink under `src`). the cache practice's `declarations` fixture lives at
  `test/assets/cache/declarations` for exactly this reason.

## .exemplar

`src/practices/persist-with-rds/bad-practices/terraform-parameters/.declapract.integration.test.ts`
— proves the forget-rewrite end to end (each `resource "aws_ssm_parameter"` becomes a
`removed{}` forget block, `data` reads dropped), plus a twice-apply idempotency pass,
with before/after snapshots of the terraform file.

## .enforcement

- a fix with logic and no integration test = blocker
- an integration test that asserts the `executeApply` call resolved but never reads
  the produced file = blocker (it proves none of the wiring)
- a produced/rewritten file with no full-content before/after snapshot = blocker

## .see also

- `rule.require.idempotent-fixes.md` — the twice-applied rerun test every fix also owes
- `howto.craft-practice-migrations.md` — the migration pattern these tests prove
- `howto.add-bad-practice.md`, `howto.add-best-practice.md` — the unit-test layer
- `rule.require.snapshots` (mechanic practices) — why snapshot + assert, not either alone
