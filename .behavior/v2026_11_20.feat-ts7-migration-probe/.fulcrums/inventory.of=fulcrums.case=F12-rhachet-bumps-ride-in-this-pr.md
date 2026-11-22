# F12 · the rhachet bumps ride in this pr

- fork: the worktree holds a rhachet bump this route did not author: `rhachet` 1.50.1 → 1.53.0, three role packages, the `prepare:rhachet` role list, an `upgrade:rhachet` npm command, a pnpm hint in `.husky/check.lockfile.sh`, and `settings.of.repo.json` permissions and hooks. a peer review called it a scope leak. options:
  - (a) carve it out into its own commit or pr
  - (b) let it ride with the ts7 change
- taken: (b).
  - the director set the rule for this route: leave the bump as found, to ride along at commit
  - `rule.require.git-release-confidence` names rhachet and role bumps, `settings.json`, and generated manifests as routine, in scope by default; it stops only for a secret value or a downgrade, and neither is present (the one suspicious pin, a self-dependency, is removed: F10)
  - the bump came from `rhachet upgrade`, not from `declapract.self.apply`; the self-apply touched only `package.json` `typescript` and `tsconfig.json`
- rework: clean. a separate commit of the listed paths, before the ts7 commit.
- confidence 90%: the director's rule settles it; residual is a reader of the pr who wants the diff smaller.
- where: `package.json`, `pnpm-lock.yaml`, `.husky/check.lockfile.sh`, `settings.of.repo.json`; review r11 point 1.
- verdict: —
