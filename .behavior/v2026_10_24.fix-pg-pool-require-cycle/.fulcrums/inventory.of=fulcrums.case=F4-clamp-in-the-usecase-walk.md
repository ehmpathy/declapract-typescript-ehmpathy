# F4: the clamp is a cycle check step in the usecase walk

- fork: a new small suite that installs pg + the shipped patch in a temp repo · a step in
  `typecheckBestPracticeTemplates.declapract.integration.test.ts`
- taken: the usecase walk. it already applies, floor-pins, and installs each usecase, so it is the adopter's real path;
  the extra step costs one dpdm run per usecase and clamps every usecase's cycle check at once
- rework: clean — the step can move to its own suite
- confidence: 85%. other usecases may surface unrelated cycles once the step runs; if so, that is real signal, but it
  may widen the round
- verdict: —
