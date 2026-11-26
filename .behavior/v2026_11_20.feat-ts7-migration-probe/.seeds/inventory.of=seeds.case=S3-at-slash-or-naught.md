# S3 · `@/` or naught

## .said

conversation comment on #839, quoting the pr body's break row:

> > the template lays down @src/*. ⚠️ a bare 'logic/x' import or a repo's own alias fails with TS2307: move it to @src/
>
> nah. no one should import bare 'logic/x' ever. and we should rip out @src too. @/ or nothing.

## .settled

- the one path anchor is `@/`: template `paths` is `"@/*": ["./*"]`, and imports read `@/src/...`.
- `@src/` leaves the library: every template, fix, mapper, and guard that names it moves to `@/src/`.
- bare imports (`'logic/x'`) are no supported shape; the break text does not offer a path for them.

## .landed

| where | what |
|---|---|
| `.fulcrums/inventory.of=fulcrums.case=F24-one-alias-anchor-is-src.md` | verdict: overturned to (b), `@/` |
