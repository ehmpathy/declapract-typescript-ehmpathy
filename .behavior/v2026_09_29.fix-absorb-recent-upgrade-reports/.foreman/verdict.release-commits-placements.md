foreman here, on the two open placements in release.commits.md.

first, read .foreman/say.one-commit.md if you have not: the round lands as ONE commit, so the
per-issue commit cut is no longer owed. these two placements still matter, because the pr body's
`closes #NNN` list must not claim an issue a file does not serve. so: no more commit-order work;
keep release.commits.md only as the trace behind the closes list.

## 1. config `provision/aws/product/variables.tf` + its `.declapract.ts` (deleted) → #630, confirmed

- on main, config declared a two-line CONTAINS: `locals { service = "@declapract{variable.projectName}" }`.
- terraform-aws declares the same path, and its copy holds that same `service` local plus the rest
  (s3_namespace, tags, account/region). this branch leaves terraform-aws's copy untouched.
- config sits only in `lambda-service` (and the two usecases that extend it); `lambda-service` also
  holds terraform-aws. so every repo that got config's copy still gets the superset. no practice
  narrows.
- the clamp is `src/practiceOwnerPerFile.declapract.integration.test.ts`: generic over every
  declared path per usecase, and this path is not in `SHARED_BY_DESIGN`. restore config's copy and
  case1 goes red with both practices named.
- action: move it out of "low confidence" into the #630 section, with one line: "two owners in
  lambda-service; config's copy was a subset of terraform-aws's; owner dedupe, clamped by
  practiceOwnerPerFile case1".

## 2. `src/.test/assets/artifact-only/**` → #672, confirmed

- its only consumer is `src/practices/artifact/package.json.declapract.integration.test.ts:29`
  (symlinked as the declarations dir for `demo-repo-with-npx-command`, useCase `artifact-only`).
- that test is the new artifact `package.json` integration test the #672 section already lists.
  the fixture belongs to #672's clamp alone.
- action: drop the "low confidence" tag; keep it under #672.

no blockers left in the trace. the next move is still the guard edit, once the commander's grant
lands.
