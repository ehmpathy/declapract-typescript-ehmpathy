# F10 · drop the self-devDependency that rode in with the rhachet bump

- fork: the uncommitted rhachet bump added `"declapract-typescript-ehmpathy": "0.50.0"` to this repo's own devDependencies. options:
  - (a) keep it, as part of the routine bumps that ride along
  - (b) remove it
- taken: (b).
  - two peer reviewers flagged it (r010, r011), and the repo's own `node/self-deps-not-link` bad-practice names this exact shape
  - the lockfile resolved a second, published copy of this package, with a `typescript@7.0.2` peer: a dependency graph that lies about which copy runs
  - no consumer reads it: `rhachet upgrade` names no declapract package in its dist, and `.depcheckrc.yml` already ignores the name, so the dep added no signal
- rework: clean. one line in `package.json` and its lockfile entry; `pnpm add -D declapract-typescript-ehmpathy@0.50.0` restores it.
- confidence 88%: residual is a purpose the human had in mind that no file records.
- where: `package.json` devDependencies; reviews r010 stale-list, r011 blocker 2.
- verdict: —
