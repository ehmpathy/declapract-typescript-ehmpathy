# F23 · the root `.husky/check.lockfile.sh` lands the husky practice's template, byte for byte

- fork: peer review r001 of 5.3 (repo-rules, blocker.1) reads the root `.husky/check.lockfile.sh` diff as a hand-edit that bypasses the practices. options:
  - (a) revert the root hook to its prior text, and leave it behind the template
  - (b) keep the root hook equal to `src/practices/husky/best-practice/.husky/check.lockfile.sh`
- taken: (b).
  - `diff` of template vs root exits 0. the template's `pnpm-lock.yaml` branch has been on main since #371
  - this repo applies its own husky practice to itself, so the template's text is the root's declared content. a revert would re-open a drift that the next self-apply closes again
  - the expo `[t5]` assertion the review cites belongs to the pnpm practice's `husky-lockfile-check` bad-practice, a different transform that this repo does not take
- rework: clean. one file back to its prior text, if the director rules (a).
- confidence 90%.
- where: `.husky/check.lockfile.sh`.
- verdict: —
