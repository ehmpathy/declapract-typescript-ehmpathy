# F104 — the repo boot.yml holds its 5,000 cap by a narrower say set

- **fork:** (a) raise the `budget` cap so every practice-author rule stays `say`; (b) keep the cap
  and move the heavier rules to `ref`; (c) keep the cap and move the skill docs
  (`declapract.walk.sh`, `route.concerns.dispose.sh`) to `ref` instead.
- **taken:** (b), adopted from an edit the foreman made before its charter forbade tree edits
  (`.foreman/say.foreman-edits-to-adopt.md`). the boot halted at 5,204, then 5,118, over the cap.
  the say set now holds `declapract-check-semantics`, `declapract-default-check-equals`,
  `rule.require.entool-requests-as-practices` and `rule.forbid.timestamp-hook-exemptions`.
  `declapract-overview`, `rule.require.declapract-integration-tests`, `rule.require.idempotent-fixes`,
  `rule.avoid.runtime-forks`, `rule.forbid.stage-term` and `rule.forbid.access-permission-not-place`
  boot as `ref`, one fetch away by path. `use.apikeys.*` and `husky.lock.restamp.sh` boot as
  skill refs. the term `.reason` / `example` globs move from `ref:` to `not:`, the shape the rhachet
  practice's own boot.yml findsert declares (#689, F62).
- **why (b):** the cap is the file's own guard against a bloated boot, and the file names
  demotion as the first remedy. a raised cap would need its own reason, and none was given.
- **measured:** `npx rhachet roles cost --repo .this --role any` = 4,747 / 5,000 (95%). the rhachet
  integration lane (incl. `boot-yml-findsert`) passes, 30/30.
- **rework:** clean — a list edit in one yaml file.
- **confidence 80%** — the five demoted rules are blockers a practice author must not break
  (`stage-term`, `access-permission-not-place` above all). as refs they load only when a reader
  fetches them. (c) may keep more of them resident; it was not measured.
- **where:** `.agent/repo=.this/role=any/boot.yml`.
- **verdict:** —
