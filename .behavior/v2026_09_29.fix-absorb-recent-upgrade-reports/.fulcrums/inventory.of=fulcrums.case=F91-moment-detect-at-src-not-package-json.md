# F91 — the moment bad-practice detects at src imports, not package.json

## .the fork

- **A:** keep the detection on `package.json` (the `moment` dependency), with no fix.
- **B:** detect at `src/**/*.ts` (import, side-effect import, and require forms); delete the package.json check.

## .taken

B. a package.json detection has no safe fix (a dropped dependency breaks every import), and a
no-fix detection marks the whole `package.json` manual — which blocks every other package.json fix in
the same apply. at `src/**/*.ts`, the manual flag lands on the file the adopter must migrate.

## .rework

clean. restore the package.json declaration and drop the src glob; the fix-coverage allowlist entry
goes with it.

## .re-raised for the council

peer `enroll-impl-arch-defects` (i005, blocker.1) reads B as a narrowed practice, against the wish's
"no fix narrows a practice a service relies on". the call is reserved here, so it is disputed with
this entry as its `--why` and handed up, not argued down. the case for B against that read: the
practice flags the same defect (moment in use) at the file that holds it; what is dropped is a flag
on a dependency no file imports, and the package.json form is the one that marked `package.json`
manual and so blocked every other package.json fix in the apply. no service capability rides on a
bad-practice flag. a reversal is clean, per `.rework`.

## .confidence

75% — a repo that lists `moment` but never imports it is no longer flagged; that dependency is
dead weight, not a defect the practice must report.
