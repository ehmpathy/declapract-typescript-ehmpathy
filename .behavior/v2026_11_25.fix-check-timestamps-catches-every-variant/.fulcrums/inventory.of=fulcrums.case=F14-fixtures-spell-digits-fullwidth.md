# F14 — test fixtures spell clock digits in fullwidth form

## .the fork

once code files are scanned (#845), every clock fixture in this repo's own test sources halts its
own commit. three paths:

- spell fixture digits fullwidth (０-９); a helper restores ascii at runtime
- build each fixture from parts (`${'13'}${'42'}Z`), placed per row so no form matches
- splice a marker after every digit, stripped at runtime

## .taken

fullwidth. each row stays legible as the clock it tests, the edit is one character class, and the
probe proves the sources halt on no line. the helper is one function, `asAsciiDigits`.

## .the cost

the hook reads ascii digits only, so a fullwidth clock in prose passes. any runtime-built fixture
has the same blind spot: a source the hook can read past is one a writer can too. no natural writer
or log emits fullwidth digits, so the blind spot is narrow.

## .rework

clean: swap the helper for a parts builder in three test files; the hook does not change.

## .confidence

75%: the commander may prefer the hook also fold fullwidth digits, which forces the parts builder.

## .where

`src/practices/husky/.test/asAsciiDigits.ts`; #845 round on pr #843.

## .verdict

open.
