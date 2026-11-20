# F20 — the husky hooks stay sourced into `pre-commit` this release

## .the fork
- a: run each `check.*.sh` as a child process (`sh "$(dirname -- "$0")/check.x.sh" || exit $?`)
- b: keep them sourced; each fails closed as it stands; catch a dream

## .taken
b. a changes the EQUALS-checked `pre-commit`, and with it how an adopter's own extra lines in that file run (shell options and variables no longer leak, nor are they shared). that is a behavior change for adopters, outside the defects this absorb fixes. the hooks fail closed today, clamped per hook. two follow-ons share the rework: the prefixed globals, and the newline-in-path read (a path git quotes cannot be read back by line; a child process could take `-z`).

## .rework
dirty. every adopter's `pre-commit` changes on the next apply.

## .confidence — 85%, why not higher
the reviewer named the next release for it too; a peer may still prefer it now.

## .where
`husky/best-practice/.husky/pre-commit`, `check.*.sh`; dream `v2026_11_19.reseed.husky-hooks-as-child-processes`

## .verdict
— (awaits review)
