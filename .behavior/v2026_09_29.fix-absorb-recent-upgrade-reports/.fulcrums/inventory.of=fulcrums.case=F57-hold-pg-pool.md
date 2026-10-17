# F57 — #682: hold the pg pool until ahbode/svc-service-providers#68 ships

- **fork:** (a) hold #682 open, with a comment that names svc-service-providers#68; (b) design the
  module-scope pool here now.
- **taken:** (a). the issue itself gates on that pave ("pave first, then lift"), and seed S5 admits
  only shipped work. the pool also touches the file #652, #664 and #673 rewrite this round, so a
  lift later rides one settled shape.
- **rework:** clean — the hold comment comes off when the pave ships.
- **confidence 85%, low because:** the pave could stall, and the per-call client costs real cold
  starts meanwhile.
- **where:** the D2 table in `1.vision.experience.case=_.md`.
- **verdict:** —
