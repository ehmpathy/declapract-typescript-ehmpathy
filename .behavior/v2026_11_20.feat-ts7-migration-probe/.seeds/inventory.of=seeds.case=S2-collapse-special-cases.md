# S2 · collapse the special cases

## .said

review body on #839:

> the amount of special cases you listed is a concern
>
> distill them down to the fundamental best practices and remove special cases
>
> lets collapse complexity
>
> ---
>
> forked typescript expo and node is fine, makes sense

line comment on the `@/` alias dream:

> lets make @/src the only path anchor
>
> to be consistent

line comment on the `imports-not-used-as-values-kept` readme:

> why not just ship with remove unused on? dependencies must have tests which will catch these if it matters

line comment on the `tsconfig-options-removed-in-ts7` readme:

> this was a lot of text
>
> whats the tldr
>
> and can we just remove all the special conditions and make all repos conform to our prescription of best practices instead?
>
> hard breaks are fine
>
> rough fixes are fine

line comment on the reseed dream:

> dispatched all the reseeds?

## .settled

- the ts7 tsconfig fix is one rule: remove `baseUrl` (with the `paths` it anchored) and `importsNotUsedAsValues`, at any value; the template's `paths` land. no fold, no per-dir keys, no manual bad-practice.
- a hard break on an adopter's next typecheck is acceptable; a rough fix (plain json, comments lost) is acceptable.
- one path alias anchor in the typescript-node template (F24 reads which one).
- the expo / node fork stands.
- a route's reseeds are owed a dispatch, not only a caught dream.

## .landed

| where | what |
|---|---|
| `src/utils/asTsconfigWithTs7OptionsRemoved.ts` | replaces the fold |
| `.fulcrums/inventory.of=fulcrums._.md` | F3, F7, F13, F14, F19, F21 superseded; F24 added |
| `.radio/` | two reseeds held for the radio |
