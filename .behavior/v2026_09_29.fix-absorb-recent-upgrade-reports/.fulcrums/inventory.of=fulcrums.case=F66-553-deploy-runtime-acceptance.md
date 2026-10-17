# F66 — #553: how much of acceptance runs on the deploy runtime

- **fork:** (a) a handler load + invoke smoke check inside `node:<deploy major>` in ci; (b) the full
  acceptance suite on that runtime; (c) close as covered by #552.
- **taken:** (a). it catches the skew class (a syntax or api the deploy node lacks) at a fraction
  of the cost; #552 removes the skew source, (a) proves it.
- **rework:** clean — widen the job to (b).
- **confidence 60%, low because:** a skew that only a real request path meets slips past (a).
- **where:** `serverless/best-practice/package.json` — `test:runtime`, called by
  `deploy:release:ancient` after `npm run build`, before `sls deploy`.
- **as built, and why it differs from the fork as written:**
  - a **pre-deploy gate**, not a `.test.yml` job: it guards the one act the skew harms (a ship),
    on every deploy path (ci or laptop), and needs no second `build:artifact` in the pr suite.
  - **load, not invoke**: `require` of each handler runs its module scope and every static import
    under `public.ecr.aws/lambda/nodejs:<major>`, which is where a node-major skew (syntax, an
    absent api at import) surfaces. a generic invoke cannot exist: each handler needs its own
    valid event and live deps, so an empty-event invoke fails on input, not on runtime.
  - the residual the 60% names stands: a skew met only inside a request path slips past.
- **rework:** clean — add a `.test.yml` job that calls `npm run test:runtime --if-present` after
  `build:artifact`, if the council wants the gate on every pr too.
- **verdict:** —
