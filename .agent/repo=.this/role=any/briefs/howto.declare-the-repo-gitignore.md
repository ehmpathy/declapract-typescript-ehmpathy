# howto: declare the repo-root `.gitignore`

several practices declare this one file. this is what they share — read it before you add a line
to one of them, or add a new declarer.

## the declarations add up

a practice declares the ignores for the dirs it creates, so a repo that takes it without the
others still gets them. the union is insert-only, so the declarations accumulate rather than
compete.

## they agree because they share one algorithm

`src/utils/defineExpectedGitignoreContents.ts` holds the union, the sort, and the ordered tail.
each practice declares only its own `ignoresSortable`.

a declaration that re-derives that algorithm instead of the import can emit a different shape —
and then each rewrites the file the other produced, on every `declapract fix`.

⚠️ edit the shared util and you have edited every repo-root `.gitignore` this repo declares, at
once.

## a new declarer owes cross-declarer tests

idempotency does not imply convergence. a declaration can be a perfect fixed point with itself —
its fix twice over changes zero bytes, its check passes on its own output — and still agree with
no other declarer. its own suite cannot see that.

the end-to-end proof is `src/practices/git/.declapract.integration.test.ts`.

## the tail is ordered on purpose — do not sort it

every emitted `.gitignore` ends with:

```
node_modules
!.test*/**/node_modules
!.test*/**/node_modules/**
```

git honors a negation only when it appears after the pattern it negates. `!` precedes
alphanumerics in ascii, so a sort hoists both negations above `node_modules` and they go
**inert** — the file still reads as correct while the test fixtures they protect are silently
re-ignored.

`ignoresOrderedForGitignore` holds these three out of the sort for that reason. the clamp is `the
node_modules negation is honored by git itself`, which puts the question to git rather than to the
file, so it goes red on an inert negation where an assertion on line order would stay green.

## the check is an exact equality, on purpose

`check` asserts `contents` equals what `fix` would emit. that is not "the file must hold exactly
the declared set" — the expected value unions the file's own lines in, so custom ignores survive.
what it mandates is **order**, which a `contains` check cannot see, and order is what git's
negation semantics make load-bearer.

it also makes `check(x) ⟺ x == fix(x)`, so `declapract fix` cannot loop.
