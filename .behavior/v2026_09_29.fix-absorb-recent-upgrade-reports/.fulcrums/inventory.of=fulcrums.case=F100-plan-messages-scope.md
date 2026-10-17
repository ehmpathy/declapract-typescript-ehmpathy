# F100 — 5.3: which adopter plan messages are fixed in this round

## .the fork

the ergonomics review found three shortfalls in what an adopter reads in a fresh repo's final plan:

1. six absent-file `FIX_MANUAL` rows said only "Expected file to exist"
2. `serverless.yml`'s absent row says the same, from a `CONTAINS` check
3. ~150 `NO_CHANGE` rows for this repo's own test fixtures, read by declapract as declarations

- **A:** fix all three here.
- **B:** fix 1 (five `EXISTS` checks → `asPresenceCheck`, which names what to author); dream 2 and 3.

## .taken

B. row 1 is a swap of five one-line checks for a helper with one message each: same verdict, same
`FIX_MANUAL`, a message that names the file. row 2 needs either a new create-on-apply behavior for
every lambda-service adopter or a hand-rolled contains — a design call, not a message edit. row 3
lives in declapract core (S5). dreams: `dreams/v2026_10_16.fix.serverless-yml-absent-names-the-fix.md`,
`dreams/v2026_10_16.reseed.declapract-plan-reads-practice-test-files.md`.

## .rework

dirty: row 2's create option changes what `apply` writes for adopters; row 3 is another repo.

## .confidence

75% — row 2's create option may be what the practice author intended all along, and is cheap if so.
