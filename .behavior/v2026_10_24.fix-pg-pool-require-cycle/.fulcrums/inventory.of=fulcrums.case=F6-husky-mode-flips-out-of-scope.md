# F6: the `.husky/` mode flips stay out of this pr

- fork: refactor `.husky/check.secrets.sh` and `.husky/check.timestamps.lock.sh` per the decode-friction and
  positional-args lanes · leave both hooks as they are and keep them out of the commit
- found: `git diff` on both files shows `old mode 100644 / new mode 100755` and no content change. the worktree
  flipped their mode; this change never edited a line of either. the lanes read them because the mode flip puts
  them in the diff
- taken: leave both hooks alone, and stage the commit by explicit path so neither lands. a human restores the mode
  with `git checkout -- .husky/check.secrets.sh .husky/check.timestamps.lock.sh`
- why not refactor: both hooks are practice-owned outputs (`husky` practice; `rhx husky.lock.restamp` keeps the root
  copy in step). an edit to the root copy alone drifts from the practice and fails the self-application test; an
  edit to the practice is a husky change, outside a pg-pool wish
- the role bumps ride along: `rhachet` 1.49.2 → 1.50.1 is the wish's; its role peers (`rhachet-brains-openrouter`,
  `rhachet-roles-bhrain`, `-bhuild`, `-ehmpathy`) and the `statusLine` the bhrain bump writes into
  `settings.of.repo.json` land with it, per `rule.require.git-release-confidence` ("rhachet/role package bumps …
  `.claude/settings.json` … in scope by default")
- rework: clean — a later husky pr can extract the named transformers in the practice and restamp
- confidence: 95%. the diff shows no content change
- where: `.husky/check.secrets.sh:48`, `.husky/check.timestamps.lock.sh:22,49,50`
- verdict: —
