# F6 — #630: one owner per multi-declared file

- **fork:** for each file two practices declare in one usecase, pick one owner and strip the other
  claim — or keep both and make each check tolerate the other.
- **taken:** one owner per file, per `refs/research.cicd.md` § #630: persist-with-rds owns
  `config.schema.ts` (config keeps a tolerant check, writes only when absent); templates use `@src/…`
  imports so `relative-imports` stops its fight; husky owns `check.lockfile.sh` (npm block dropped);
  cicd-common owns `test.yml` (expo copy deleted); terraform-aws owns `environments/*/main.tf`
  (environments-aws EXISTS claims and the dynamodb CONTAINS claim deleted); conventional-commits owns
  the commit hooks.
- **rework:** clean — each owner move is one declaration file; a swap moves it back.
- **confidence 80%, low because:** `config.schema.ts` (70%) and the husky commit hooks (65%) could
  as well go the other way; the dynamodb `endpoints{}` claim (60%) may encode a real local-dynamo need.
- **where:** see the research table; clamp = the per-usecase multi-declarer test.
- **verdict:** —
