# F4 — clocks already committed stay put in this pr

## .the fork
- A: scrub the 12 tracked lines in older `.behavior/` routes that hold a clock
- B: leave them; the hook scans staged blobs only; catch a dream for the scrub

## .taken, why
B. the wish bounds this work to the hook and its tests, under an hour. a scrub touches 9 files in
other routes and git history keeps the old text regardless.

## .rework, why
clean: a later pr masks the lines; no code depends on them.

## .confidence, why low
85%. a scrub is cheap, and the wish's "why" is privacy; a reviewer may want it in.

## .where
`rhx check.timestamps.probe --cases @tracked` lists the 12 lines. dream:
`dreams/v2026_11_25.chore.scrub-committed-clocks.md`.

## .verdict
ruled by the wisher: confirmed as taken (seed S3).
