# F11: "built on rhachet 1.50.1" means this repo's build tools, not the floor adopters inherit

- fork: bump this repo's own `rhachet` devDependency to 1.50.1 · also raise the rhachet practice's shipped floor
  (`src/practices/rhachet/best-practice/package.json`, `check.minVersion('1.49.2')`) to 1.50.1
- read: the wish says the work is "built on the latest rhachet release (1.50.1, which carries rhachet#636)". "built
  on" names the tools the build ran on. the pg-pool fix reaches adopters through `persist-with-rds`, and needs no
  rhachet feature at all
- taken: this repo's `package.json` moves to 1.50.1, with its role peers (F6). the shipped floor stays at 1.49.2
- why not raise the floor: a floor is the oldest release a practice accepts. a raise forces every adopter to
  upgrade rhachet on their next apply, for a cause this pr does not carry. that call belongs to a rhachet-practice
  change with its own reason
- rework: clean — one `check.minVersion` edit in the rhachet practice, plus the walk's floor pin follows it
- confidence: 75%. the wish could mean "adopters land on 1.50.1" if rhachet#636 fixes a defect adopters meet
- where: `package.json`, `src/practices/rhachet/best-practice/package.json`
- verdict: —
