# F15 — the rhachet and role bumps in the tree ride the pr as a separate chore(deps) commit

## .the fork
- a: revert the bumps (`rhachet` 1.50.1→1.52.0, the four role packages, `declapract` 0.13.27, the self devDep at 0.50.0, the `upgrade:rhachet` and `prepare:rhachet` scripts, the actor `settings.of.repo.json`) out of this tree
- b: keep them, and land them as their own `chore(deps)` commit in the absorb pr, apart from the `fix(...)` commits
- c: fold them into the fix commits

## .taken
b. this session did not author them; they stood in the tree when the drive began, the shape of a grove `rhachet upgrade`. a revert would undo work another actor on this grove may own. routine tool and role bumps ride a release by default; a separate commit keeps each fix commit's diff to its issue, so a reader never meets them inside one.

## .rework
clean. a revert of one commit, or a drop before the push.

## .confidence — 80%, why not higher
the self devDep `declapract-typescript-ehmpathy: 0.50.0` is unusual; its purpose (the self-apply skill reads the published dist?) is unverified here. a human may want it gone.

## .where
`package.json`, `pnpm-lock.yaml`, `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json`

## .verdict
reworked to c at the push. `git.commit.set` requires a branch's first commit to be `fix(...)` or `feat(...)`, and the bumps stood staged first; no paved command unstages them, so the fix commit could not go first apart from them. the bumps ride the one absorb commit, and its body names them on their own lines. a split stays a clean rework: drop the bump lines into their own commit before the merge
