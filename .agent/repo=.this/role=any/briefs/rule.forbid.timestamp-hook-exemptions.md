# rule.forbid.timestamp-hook-exemptions

## .what

the husky timestamp hook (`src/practices/husky/best-practice/.husky/check.timestamps.sh`) blocks
every timestamp in every tracked file. **never add an exemption to it** — not a path, a dir, a file,
a glob, an allowlist, a flag, or a looser pattern. zero exceptions.

## .why

- **privacy.** a timestamp in a tracked file is a privacy leak. it ships to every clone and fork,
  forever; git history cannot take it back once pushed. it also churns every diff.
- **the hook exists to block all of them.** an exemption is how they return — one dir today,
  every dir tomorrow. a request to exempt a path is a request to fix the writer of that path.
- the only skip is `*.ts | *.sh`: code that computes time, not data that records it. it never widens.

## .how it is enforced

- `check.timestamps.lock.sh` runs first in `pre-commit`. it halts any commit while the timestamp
  hook differs, on disk or in the index, from the git blob id the practice stamped at apply:
  "revert the hook, zero exceptions — remove all timestamps".
- `check.timestamps.lock.play.declapract.integration.test.ts` [case3] fails if the hook's skip list
  grows past `*.ts | *.sh`.
- this repo applies the practice to its own `.husky/`. after any edit to the practice hook (a tighter
  pattern, a reworded comment), run `rhx husky.lock.restamp`: it copies the hook to the root and
  re-stamps the root lock. `husky/self-application.declapract.integration.test.ts` fails until you do.

## .what to do instead

| the ask | the answer |
|---------|------------|
| "exempt `<dir>/`, its writer appends a clock" | fix the writer to mask the clock (e.g. `[time]`); catch a reseed dream if it lives in another repo |
| "a snapshot holds a timestamp" | mask it in the test before `toMatchSnapshot` |
| "a fixture needs a time" | use a duration (`PT12:30:00`) or a date alone, or mask it |
| "the hook halts a false positive" | tighten the pattern so the false positive no longer matches — never a path skip |

## .enforcement

- an exemption of any kind added to the timestamp hook = **blocker**
- an edit to the lock to let a changed hook through = **blocker**
- a reason given for the hook that drifts from the one the hook states = **nitpick**

## .see also

- `howto.declare-the-repo-gitignore.md` — the same "fix the source, not the guard" stance
- `rule.require.entool-requests-as-practices.md` — a request lands in the practice that owns it
