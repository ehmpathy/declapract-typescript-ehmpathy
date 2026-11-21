# F4 — the timestamp hook takes no data-store exemption (#788 item 2)

## .the fork
- a: a declared, lock-pinned exemption list (`.timestamps.allow`) for committed data stores
- b: no exemption; the writer of the store stops a clock (a date, a duration, or a mask)

## .taken
b. `rule.forbid.timestamp-hook-exemptions` (this repo) makes any exemption a blocker, path or list alike: a timestamp in a tracked file is a privacy leak that ships to every clone, and an allowlist is how the leak returns. the cure sits with bhuild's prioritizer, which writes `createdAt` clocks into `.eco/*`.

## .rework
clean. no code lands; the issue gets the reason and a reseed to bhuild.

## .confidence — 92%
the rule is explicit. the wisher may still overrule it; that is a rule change, not a fix.

## .where
issue #788 (item 2 declined with reason; the other nine items fixed)

## .verdict
— (awaits review)
