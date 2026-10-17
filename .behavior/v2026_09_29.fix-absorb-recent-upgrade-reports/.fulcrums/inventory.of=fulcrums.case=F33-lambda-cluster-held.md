# F33 — the lambda cluster (#646, #650, #640, #631) is held on sdk-aws-lambda 0.7.1

- **fork:** under S5 (only published releases), (a) floor at the published 0.7.0 and land the
  cluster now; (b) hold the cluster until 0.7.1 publishes.
- **taken:** (b). 0.7.0's `FrozenDeep` maps a branded string into an object shape, so a handler
  that returns an `IsoTimeStamp` (which dates-and-times mandates) fails tsc on 0.7.0 — (a) ships a
  B1 defect into every adopter. the other three hinge on the same floor: #650's test rewrite bumps
  adopters onto 0.7 without the handler rewrite; #640's guide would teach a shape above the floor;
  #631's ancient-payload operation binds a 0.7 `struct` option.
- **rework:** clean — once 0.7.1 publishes, the cluster is F7/F8 as written.
- **confidence 70%, low because:** a narrower slice might stand on 0.7.0 (e.g. #650 alone, if the
  test operations exist at a floor adopters already hold); not measured.
- **where:** `node-service`, `tests-service`, `simple-lambda-handlers`, `simple-lambda-client`.
- **verdict:** the hold lifted (seed S6). `sdk-aws-lambda@0.7.1` published 2026-10-03 with the
  branded-primitive fix (sdk-aws-lambda PR #62). the cluster lands at a 0.7.1 floor, per F7 and F8;
  #631 keeps its one documented cast until sdk-aws-lambda#42 releases.
