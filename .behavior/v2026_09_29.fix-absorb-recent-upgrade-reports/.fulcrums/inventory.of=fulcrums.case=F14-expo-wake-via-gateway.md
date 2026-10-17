# F14 — #621: expo prepare wakes livedb via-gateway

- **fork:** the expo prepare wakes the prep livedb by default (`reaches: 'via-gateway'`), or only on
  an opt-in `start:livedb:prep`.
- **taken:** wake by default. an expo app's acceptance run reaches the db through the prep gateway,
  and a cold aurora is the exact timeout #621 reports; the wake is a no-op when warm.
- **rework:** clean — one field in the prepare call.
- **confidence 55%, low because:** an expo app with no db behind its gateway pays a wake call per run
  for naught; the opt-in is the conservative alternative.
- **where:** `useWakeOfLivedb.ts` moves tests-node → tests-any with `getWakeDecision`; new
  `tests-expo/best-practice/{jest.integration,play.acceptance}.prepare.ts`.
- **verdict:** —
