# F67 — #552: the source of the serverless runtime

- **fork:** (a) the `serverless.yml` fix reads the consumer's own `.nvmrc` at check time; (b) it
  reads the node practice's `.nvmrc` from this library.
- **taken:** (a). the consumer's file is what its build node uses; the skew is between the two
  files in that repo.
- **rework:** clean — one read.
- **confidence 75%, low because:** a consumer `.nvmrc` with an unparseable value needs a loud stop,
  not a guess.
- **where:** `serverless.yml.declapract.ts:60` (today hardcodes 22).
- **verdict:** —
