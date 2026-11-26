# F3 — unanchored dot, dash, and basic forms still pass

## .the fork
- A: halt `hh.mm`, `hh-mm-ss`, bare `hhmm` with no anchor (no T, date, zone, or meridiem)
- B: let them pass; halt them only once an anchor marks them as a clock

## .taken, why
B. each shape is shared with a far more common non-clock: `hh.mm` with decimals and versions,
`hh-mm-ss` with `dd-mm-yy` dates, bare `hhmm` with years, ports, counts, and page ranges. a hook that
halts every year in every doc gets bypassed, and a bypassed hook guards none.

## .rework, why
clean: add a form to the alternation; the tests already list these as pass rows.

## .confidence, why low
80%. the wish says "every variant"; this leaves three shapes through by design. the inventory names
them (rows 18–20) so the gap is on record, not hidden.

## .where
the hook's form list; inventory rows 18–21.

## .verdict
ruled by the wisher: confirmed as taken (seed S3).
