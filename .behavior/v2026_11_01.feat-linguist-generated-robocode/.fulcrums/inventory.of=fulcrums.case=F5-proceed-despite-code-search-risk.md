# F5: proceed despite the code search risk

## .the fork

- **A. proceed** — ship the collapse as the wish asks; probe code search on the pilot branch before release; report the result.
- **B. hold** — halt until code search behavior is confirmed.
- **C. narrow** — drop `*.test.ts` from the collapse, to keep tests searchable.

## .taken: A

the wish asks for the collapse, and the probe costs one search on a pushed branch. b stalls the vision on a fact the pilot measures anyway. c overrides the wish on an unproven risk.

## .rework: clean

if the probe shows tests vanish from search and the wisher rejects that cost, remove one line from the tests-any section.

## .confidence: 60%, why low

github code search states "vendored and generated code is excluded", and no doc says the exclusion ignores `.gitattributes`. the risk is likely real. what is unknown is whether the wisher weighs it above review minutes.

## .risk: none

no credential, no prod write. the probe pushes a non-default scratch branch and runs a github code search under the human's own session: no keyrack key, no deploy.

## .where

`1.vision.yield.md` § cons, Q6, external research owed. inventory rows rs3, rs4, rs5.
