# F85 — #519: the tunnel shape closes via #638, plus a port clamp

- **fork:** (a) close with #638 and add a distinct-port assertion to its clamp; (b) a separate
  row.
- **taken:** (a). the shape is declared (`config.schema.ts:74-87`); only the port collision guard
  is new.
- **rework:** clean.
- **confidence 80%, low because:** #519 also asks for a doc of the shape, which #690's prose cut
  may trim.
- **where:** #638's config parse clamp.
- **verdict:** —
