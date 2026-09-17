# F-review-brain-swap

## the fork

on i037 re-arrive, 6 level-1 peer lanes (mech-decode-friction, arch-opport-decomposition,
arch-smell-scopeleaks, arch-hazards-maintenance, behavior-intent-coverage, ergo-friction-hazards)
returned unreadable — no verdict. cause: the default review brain `fireworks/deepseek/v4-flash`
returned HTTP 412 PRECONDITION_FAILED — the fireworks account `vladatahbode` is suspended (a hit
spend cap or an unpaid invoice). the fireworks *key* is valid and unlocked; the *account* behind it
is down.

the fork: (a) escalate as a human-fixable wall (a human settles the fireworks account), or
(b) pin the 6 lanes to a live provider via a guard edit and drive on.

## taken, and why at the time

the taken evolved across two attempts as each candidate brain proved dead:

**attempt 1 (i038 in) — pin `xai/grok/4-fast-with-reason` on the 6 malfunctioned lanes.**
`rhx keyrack status` showed ANTHROPIC, OPENAI, XAI keys all unlocked and `route.mutate` privilege
already `allowed`, so a guard edit is a driver-owned lever (`rule.always.spend-own-levers-before-escalation`).
i pinned the cheap reason-mode xai analog of the fireworks flash default. **result: dead.**
`rhachet-brains-xai@0.3.3` calls `supplier.creds()` but `rhachet@1.47.5` supplies no such method →
`TypeError: supplier.creds is not a function`. an adapter version incompatibility, not a spend wall.

**attempt 2 (current) — swap ALL 9 l1 lanes to `anthropic/claude/code`.**
diagnosis of the full brain roster:
- `fireworks/*` (the default) → HTTP 412, account `vladatahbode` suspended (a human must settle it).
- `xai/*` → the `supplier.creds` adapter crash above.
- `anthropic/claude/{sonnet,opus,haiku}` (`○` = adapter) → hard-capped at 200k tokens by
  `rhachet-brains-anthropic@0.4.3`; the review diff is ~462k, so these overflow.
- `anthropic/claude/code` + `code/opus` (`↻` = CLI-routed) → the SAME claude-CLI path the l3 lanes
  use (`rhx enroll claude --model claude-sonnet-5[1m]`), which demonstrably held the full context
  in r010 (it produced a rich substantive review; only its tally sub-brain failed). no adapter cap,
  no external account.
so `anthropic/claude/code` is the one confirmed large-context path a driver can reach without a
human. i moved all 9 l1 lanes onto it — the 6 off the dead xai pin AND the 3 off the suspended
fireworks default (which 412 too), since a re-hash re-grades all lanes regardless.

**attempt 2, l3 half — amend the two l3 prompts to conform to `contract.reviewer-output`.**
r010 and r011 (the l3 `rhx enroll claude` lanes) each produced a rich substantive review BODY via
the claude-CLI 1M path — only the TALLY step malfunctioned (`review tally fallback failed: the
sub-brain that tallies a prose review could not be reached`). the tally is a deterministic regex
parse of the stdout for `N blockers` / `N nitpicks`; only when those numeric lines are ABSENT does
it fall back to a sub-brain — and that sub-brain routes to the suspended fireworks default. the l3
prose lacked the numeric lines, so it forced the broken fallback. the fix: append to each l3 `-p`
an instruction to end with the two numeric contract lines, so the deterministic parser reads the
verdict directly and never needs the sub-brain. this is CONFORMANCE to the documented contract
(`contract.reviewer-output` states the minimal valid stdout is exactly `N blockers` / `N nitpicks`),
not a game of it.

## rework, and why clean

clean. the change is one `--brain` flag per lane. revert = drop `--brain anthropic/claude/code` (or
restore fireworks) and re-arrive once the fireworks account is settled. no code, no callers, no
downstream artifact leans on the brain choice.

## confidence, and why 70%

70%. the direction (route to the one confirmed live large-context brain) is certain. the residual
doubt: whether `rhx review --brain anthropic/claude/code` grants the same 1M window the l3
`--model claude-sonnet-5[1m]` path gets, or a default (200k) CLI window that would still overflow
462k. cannot be tested out-of-band (`rule.forbid.hand-run-reviews`), so the re-arrive is the test.
if it overflows, the sanctioned next lever is to narrow each lane's `--paths-with` to its subsystem
so the fit is under whatever window the CLI grants; if THAT is exhausted too, only then is the
fireworks-account / adapter-fix escalation warranted.

## where

`.behavior/v2026_08_31.fix-lambdas-3/5.1.execution.from_vision.guard` — the 6 level-1 peer lanes.

## the verdict, once ruled

open.
