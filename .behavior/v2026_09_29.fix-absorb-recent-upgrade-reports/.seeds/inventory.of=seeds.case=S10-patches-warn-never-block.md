# S10 — a stale or failed patch warns, never blocks

## .said

> so, for this - we instead need to just warn whenever we see them. 4. #680 patches: I left out ignorePatchFailures because it would hide a patch that silently stopped applying. Do you want it in anyway? ; otherwise, we prevent `rhx upgrade` upgrades, knawmean?

> unless theres a better way to treat that

## .settled

- an upgrade must never halt on a patch. both `allowUnusedPatches` and `ignorePatchFailures` land.
- the signal is a warn wherever a stale or failed patch is seen, not an error. to halt the upgrade
  costs more than a patch that quietly stopped to apply.
- the warn must never become a halt by another path: a declapract check with no fix marks the whole
  file manual and blocks `apply` as surely as pnpm's error did.
- a better treatment is welcome where one exists: a stale patch (keyed to a version no longer
  declared) can be retired by a fix rather than merely warned about (F56).

## .landed

- F55 verdict, F56, `1.vision.experience.case=_.md` row 680, `case=8`,
  `refs/research.dispatches-676-680.md`, `1.vision.yield.md`, `blocker/1.vision.md`
