# domain.term: defer

term.chosen   = defer
term.kind     = verb
term.synonyms.forbidden:
- skip
- postpone
- delay
- hold
- punt

## .what

of a bad-practice `check`/`fix`: to HOLD an in-place rewrite of a file to a LATER `declapract fix`
pass, because a PEER bad-practice relocates that same file THIS pass. the deferred rewrite is not
abandoned — it fires on the next pass, once the file sits at its new (post-move) path.

the distinction the word carries: a **defer** is a hold-to-next-pass (the file WILL be rewritten,
just later), NOT a `skip` (declapract's `check`-throws = permanent no-match, the file is never
touched). to conflate the two would read a temporary hold as a permanent pass.

## .refs

- `src/utils/isDeferredToDeprecatedDirMove.ts` — the shared predicate both declarers import
- `src/practices/directory-structure-src/bad-practices/old-import-paths/src/**/*.ts.declapract.ts` —
  defers a file still under a deprecated dir (its peer dir-move relocates it this pass)
- `src/practices/typescript-any/bad-practices/relative-imports/src/**/*.ts.declapract.ts` — the peer
  in-place rewriter, which defers the same deprecated-dir files in both `check` and `fix`
- the two `.declapract.test.ts` files → `deprecated-dir deferral (two-pass migration)`

## .reason

see the ref-level cluster beside this choice:
- `term=defer._.choice.reason.md` — etymology, the ENOENT collision it forecloses, rejected synonyms
