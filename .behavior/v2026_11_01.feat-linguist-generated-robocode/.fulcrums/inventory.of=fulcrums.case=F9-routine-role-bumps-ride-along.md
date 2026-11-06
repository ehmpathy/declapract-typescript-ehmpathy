# F9: routine rhachet role bumps ride along in this branch

## .the fork

- **A. keep them.** the branch carries three rhachet role package bumps (`rhachet-roles-bhrain`, `-bhuild`, `-ehmpathy`), the lockfile they move, the regenerated `settings.of.repo.json` hooks, and a mode-only change (644 → 755) on two `.husky/*.sh` files.
- **B. split them out.** move them to their own pr, so this pr holds only the wish.
- **C. drop them.** revert to the prior pins.

## .taken: A

- `rule.require.git-release-confidence` names rhachet role bumps, generated manifests, and `.claude/settings` regenerations as routine: in scope by default. it lists what to stop for — a secret value, a downgrade, a suspicious pin — and none applies: each bump moves forward
- the role upgrade is what this route runs on; c would revert the tools the drive uses
- the `.husky/` change is mode only. `git diff --summary` shows `mode change 100644 => 100755` and zero content lines. the timestamp lock compares the hook's blob id, which a mode change does not touch, so the lock still holds

## .rework: clean

if the director wants a narrow pr, the bumps move to their own commit before release: `package.json`, `pnpm-lock.yaml`, `settings.of.repo.json`, and the two mode bits. no practice code depends on them.

## .confidence: 85%, why not higher

a reviewer prefers a pure pr, a fair taste. the rule says routine bumps ride along, so the call leans to a.

## .risk: none

no credential, no prod write: version pins in a dev manifest and a file mode.

## .where

raised by peer review r10 (enroll-impl-behavior-intent) and r11 (enroll-impl-arch-defects) on 5.1 i003. files: `package.json`, `pnpm-lock.yaml`, `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json`, `.husky/check.secrets.sh`, `.husky/check.timestamps.lock.sh`.
