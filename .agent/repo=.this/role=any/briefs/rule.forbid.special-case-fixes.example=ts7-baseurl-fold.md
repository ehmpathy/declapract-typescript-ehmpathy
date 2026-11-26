# rule.forbid.special-case-fixes.example: ts7-baseurl-fold

- date: 2026-11-25
- repo: ehmpathy/declapract-typescript-ehmpathy
- branch: beav/feat-ts7-migration-probe, pr #839
- pointer up: `rule.forbid.special-case-fixes.md`

## .what happened

typescript 7 removed `baseUrl` and `importsNotUsedAsValues`. the first fix tried to keep every
adopter's imports green across that removal:
- a fold that rewrote `baseUrl`-relative `paths` into root-relative ones
- a rebase for a nested `baseUrl`
- per-dir bare-import keys and a `"*"` catch-all
- notes for `index`, `extends`, and `ts-node` variants
- a manual practice that flagged an `importsNotUsedAsValues` value of `"preserve"`

## .the cost

- nine utils and their tests existed only for the fold chain
- the practice readme ran to a page of variant notes
- the review asked for a tldr, and for the special conditions to go

## .the collapse

commit `7a5bf98` reduced the fix to one rule:
- remove both options at any value
- lay down the template `paths`
- an import that leaned on `baseUrl` fails with TS2307, and the repo moves it to the one alias

the readme now holds the two removed options plus one break line.
