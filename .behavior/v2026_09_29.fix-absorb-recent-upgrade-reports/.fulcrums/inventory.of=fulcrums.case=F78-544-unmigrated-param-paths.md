# F78 — #544: the explicit→bare param path migration

- **fork:** (a) a bad-practice whose fix stamps a review marker on explicit param paths (the #626
  marker shape) that names #637's copy step; (b) a check with no fix; (c) readme only.
- **taken:** (a). (b) marks the file manual and blocks `apply` (#607's gate); (c) is silent. an
  auto-flip would read a param that holds no value yet.
- **rework:** clean.
- **confidence 60%, low because:** the auto-migrate half waits on ghlitch#129 (published 0.3.0
  lacks it), so the marker is the whole local fix.
- **where:** new `config/bad-practices/unmigrated-param-paths/`.
- **verdict:** —
