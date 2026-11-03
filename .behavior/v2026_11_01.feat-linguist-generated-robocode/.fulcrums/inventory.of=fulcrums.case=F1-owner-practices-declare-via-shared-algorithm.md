# F1: owner practices declare their own lines, via one shared algorithm

## .the fork

- **A. one declarer** — the git practice ships every linguist line. small diff; repos with no daos get inert dao lines.
- **B. owner declarers** — persist-with-rds + persist-with-dynamodb declare dao lines, tests-any declares test lines, rhachet declares route lines, git keeps lock lines. all emit the file through one shared util (`defineExpectedGitattributesContents`), the peer of `defineExpectedGitignoreContents`.

## .taken: B

`rule.require.entool-requests-as-practices` grades a rule declared in a practice that does not create the artifact as a blocker. the gitignore system already proves the multi-declarer shape, convergence tests included.

## .rework: dirty

B converts the git practice's section fix into the shared util and adds cross-declarer convergence tests. a reversal to A tears both out.

## .confidence: 80%, why not higher

A is defensible as "git owns `.gitattributes`". and reach does not separate them: git, tests-any, and rhachet all sit in `typescript-project-core`, which every usecase extends. so for the test and route lines, A and B land in the same repos. only the dao lines differ in reach, and under A they would be inert where no daos exist.

B still holds, because the owner rule turns on who causes the artifact, not on reach. its own worked example (rhachet declares the scheduled_tasks ignore, not git) is a case where reach is equal too.

## .risk: none

no credential, no prod write. the util emits `.gitattributes` text in consumer repos via `declapract apply`. a reversal is a code teardown in this repo (dirty rework), not an act on a live system.

## .where

`1.vision.yield.md` § the contract.
