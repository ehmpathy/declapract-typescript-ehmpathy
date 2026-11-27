# F1 — a one-digit-hour `h:mm` halts

## .the fork
- A: halt `h:mm` (one-digit hour, two-digit minute) with the same left edge as `hh:mm`
- B: halt it only with a meridiem or zone after it

## .taken, why
A. `at h:mm` in prose is a time of day with no marker at all, and the wish asks for every variant.
the corpus read finds 3 one-digit clocks already leaked into this repo and zero ratios that A would halt.

## .rework, why
clean: one alternation in one regex, and one test row flips.

## .confidence, why low
75%. a scale ratio `1:nn` and a bible verse `n:nn` share the shape exactly. this corpus has none, but
other consumer repos may. the remedy (rewrite as `1-to-nn`) is cheap, and the hook's law is to fail
toward privacy.

## .where
`src/practices/husky/best-practice/.husky/check.timestamps.sh`, the colon form's hour class.

## .verdict
ruled by the wisher: A holds. a leaked hour is the harm; a `1:nn` ratio is a rare, cheap cost (seed S2).
