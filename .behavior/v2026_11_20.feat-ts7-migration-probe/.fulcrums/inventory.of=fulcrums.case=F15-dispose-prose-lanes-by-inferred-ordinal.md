# F15 · dispose the two prose lanes by inferred ordinal; dispute only the one point whose ordinal is sure

- fork: r010 and r011 wrote prose reviews; a tallier graded them (r010: 2 blockers, 13 nitpicks; r011: 8 blockers, 6 nitpicks) and kept no list of which point holds which ordinal. a disposition names one concern by `blocker.N` / `nitpick.N`. options:
  - (a) infer each ordinal from report order and dispute each refuted point by its inferred ordinal
  - (b) concede every concern; argue each refute in the `.taken`, where the re-run reviewer reads it
  - (c) dispute only where the ordinal is sure, concede the rest
- taken: (c).
  - r011 `blocker.1` is its first point, the scope leak: disputed with F12
  - r010 `blocker.1` and `blocker.2` are its two ranked must-fix points (compiler api, `types` overwrite), both repaired: conceded `better`
  - every other concern of both lanes is conceded `better`. each repaired point is a true concession. the few refuted points (r010: the floor convergence, expo, F9; r011: F11, the F13 remainder) are argued with evidence in each `.taken`; a dispute aimed at an inferred ordinal could shed a repaired point by mistake
- severity: `better` on each. the two r010 blockers would surface as loud typecheck or check failures in an adopter's ci, not as a shipped harm to a user; each is repaired.
- rework: clean. a later round renumbers; any refuted point the re-run raises again gets a dispute against its fresh ordinal.
- confidence 70%: residual is a concession on a point argued as a refute, read by a council as agreement.
- where: `.reviews/peer/*i002*r010*taken*`, `*r011*taken*`.
- verdict: —
