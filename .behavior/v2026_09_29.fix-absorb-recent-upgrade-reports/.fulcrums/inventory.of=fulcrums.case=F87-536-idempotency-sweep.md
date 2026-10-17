# F87 — #536: idempotency for every fix rides #607's sweep

- **fork:** (a) #607's check(fix(x)) sweep also asserts fix(fix(x)) === fix(x) for every
  declaration; (b) a per-fix hand test.
- **taken:** (a). one sweep covers every present and future fix.
- **rework:** clean.
- **confidence 85%, low because:** a fix whose input fixture the sweep lacks is untested.
- **where:** #607's sweep test.
- **verdict:** —
