# F1 — perf and feature asks deferred (#622, #623, #652)

- **fork:** land them this round, or leave open as `large`.
- **taken:** leave open. the wish names the fixes to land as the ones a next upgrade trips on; none
  of these trips an upgrade. #623 changes env propagation to jest workers and wants its own proof;
  #652 adds three templates + a bad-practice.
- **rework:** clean — each is an additive change, a later round picks it up as-is.
- **confidence 80%, low because:** #652 is a live prep hazard once `force_ssl` flips; the wisher may
  rank it above the round's scope line.
- **where:** `1.vision.experience.case=_.md` § D2.
- **verdict:** overruled by the wisher (seed S2) — land them this round. no report in the window
  is too large to fix.
