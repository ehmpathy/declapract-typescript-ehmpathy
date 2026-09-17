# rule.require.entool-requests-as-practices

## .what

every request to change how a repo behaves — "we want X ignored", "we want Y removed", "we want Z
configured" — is a request to **entool X into a declapract practice**, never to hand-edit this
repo's own files. this repo IS the practice library; a request is satisfied by the practice that
owns the concern, and this repo then inherits the result as practice-driven output.

"hey we want this" means: find (or add) the practice that owns it, and declare it there.

## .why

- **a practice fixes every consumer forever; an adhoc edit fixes one repo once.** the whole point
  of this library is to eliminate a class of friction at its source, so the next traveler never
  meets it. a hand-edit to this repo's `.gitignore` leaves every other consumer unfixed.
- **this repo consumes its own practices, so an adhoc edit is either reverted or duplicated.** the
  correct content for this repo's own file arrives via `declapract fix` from the practice
  declaration. a hand-edit that races the declaration is undone on the next apply, or drifts from
  it silently (the #477 self-application drift the `[case3]` self-check exists to catch).
- **"fix forward" is the wish's mandate** — repair the practice, not the symptom in one consumer.

## .the ownership rule

the practice that **creates** the artifact declares the rule for it. rhachet's role-boot harness
writes `.claude/scheduled_tasks*`, so **rhachet** declares that ignore — not `git`, which owns
only generic scratch. ask "which practice causes this artifact to exist?" and declare there.

## .the test

before you satisfy a request, ask: **"am i about to edit this repo's own file, or a practice?"**

- a practice (a `best-practice/` template or a `bad-practices/` declaration) → correct
- this repo's own file, directly → stop. find the practice that owns the concern and declare it
  there. let `declapract fix` (or the `[case3]` self-check) drive the line into this repo.

## .the worked example — the scheduled_tasks ignore

a request: "git rm any `.local.json` and `scheduled_tasks` files, and enforce it."

- 👎 **wrong** — add `.claude/scheduled_tasks*` to this repo's `.gitignore` by hand.
- 👍 **right** — declare `.claude/scheduled_tasks*` in the **rhachet** practice's
  `ignoresSortable` (rhachet's harness creates it). this repo then inherits the line as
  practice-driven output, verified by the git integration `[case3]` self-check — whose own test
  name says "add the absent line to the repo-root .gitignore, where the sort puts it."

the line that lands in this repo's `.gitignore` is then **not** adhoc: it is the sanctioned output
of the practice this repo consumes.

## .enforcement

- a request satisfied by a hand-edit to this repo's own file, where a practice owns the concern =
  **blocker** (entool it into the practice instead)
- a rule declared in the wrong practice — one that does not create the artifact it governs =
  **blocker** (declare it in the practice that causes the artifact to exist)

## .see also

- `howto.declare-the-repo-gitignore.md` — the multi-declarer `.gitignore` convergence system
- `howto.add-best-practice.md`, `howto.add-bad-practice.md` — how to entool a concern
- `domain.terms/term=declarer._.choice._.md` — a practice that declares a file; ownership vs
  declaration (rhachet owns `.claude/scheduled_tasks*` in the causal sense AND declares its ignore)
