# F97 — round i002: concerns refuted with evidence are disputed, not fixed

- **fork:** (a) concede every concern the 36 slices raised and change the code to match each;
  (b) concede the real defects (fix + clamp), and dispute each concern the code already answers,
  with the line that answers it in the lane's `.taken`.
- **taken:** (b). a concern is disputed only where one of these holds, named per concern in its
  `.taken`:
  1. the path it fears is unreachable in the declapract pipeline (a bad-practice fix runs only after
     its check returned; a `src/**` declaration runs only on a file under `src/`);
  2. a clamp already proves the behavior it doubts (cited by test name);
  3. two lanes ask for opposite changes, and the code holds a documented reason for its side
     (r021 b4 vs b8: a best-practice marker passes, a bad-practice marker stays red);
  4. the logic already sits inside a named leaf transformer, which is the remedy
     `rule.forbid.inline-decode-friction` itself prescribes; a call to split a named transformer
     further is taste, never a hazard;
  5. the cited rule, read whole, permits the shape the code holds (e.g. two copies of a test
     fixture sit inside `rule.prefer.wet-over-dry`'s "2 = copy ok"; a reviewer withdrew or
     reclassified the point in its own text; a signature change would ripple into every adopter's
     callers for a cosmetic gain);
  6. the cited code is absent from this tree: a search of the named path and of `src/` for the
     quoted symbol returns zero matches, so there is no line to change.
- **rework:** clean — each disputed concern is one function or one comment; a council that overrules
  one asks for a single local change.
- **confidence 75%** — each refutation cites code or a test, but a reviewer may still hold a point
  as taste the council would rather take.
- **where:** each `R/.reviews/peer/5.1.execution.from_vision._.review.i002.*.taken.by_self.*.md`.
- **verdict:** ruled by the foreman on round i004
  (`R/.foreman/verdict.5.1-disputed-blockers-i004.md`): of 38 disputed blockers, **37 stand, 1 is
  a real defect.**
  - **overruled — r010 b5.** `useKeyrack`'s aws-auth gate was an inline text match
    (`.includes('awsAccountId')`), not a named leaf. it gates the ec2 metadata bar and strict
    keyrack mode, so it is a security harm, and condition 4 never held for it. repaired: the named
    leaf `isAwsAuthDeclared({ useYmlText })` reads the KEY with a value (inline or a nested map),
    clamped by 8 cases plus a `useKeyrack` case; the clamps go red under the old text match. the
    stance on its given stays `disputed` in the engine (a stance is final for its given); the
    record of the overrule lives here and in r010's `.taken`.
  - **stand at nitpick** (readability, no shipped harm): r004 b2; r009 b1–b17 except b18/b19
    (repaired); r010 b1–b4, b6–b10.
  - **stand**: r001 b1–b4, r003 b1–b2, r006 b1, r030 b1–b3.
  - **the flaw in condition 4 as applied:** r010's i004 `.taken` refuted ten sites as one class
    ("these are those names"). per-site checks show four of the ten sat inline in a `fix` or a
    `defineExpected*` body (b6, b8, b9, b10) and one in an orchestrator (b5). a class refutation
    must cite each site's file:line, or it hides the site that differs.
  - **scouts, per the verdict:** the `!contents` branch in a bad-practice fix is NOT unreachable.
    `src/practiceFixCoverage.declapract.integration.test.ts` case2 runs every fix on absent input
    and requires it to settle; a throw there reddens it. so the branch stays a no-op
    (`return { contents }`), and each such fix now carries a `.note` that names the sweep
    (`sdk-aws-lambda-pre-v07/package.json.declapract.ts`,
    `with-connection-in-input/src/**/*.ts.declapract.ts`). b6's inline splice is now
    `asLibInnerWithEntryAppended` + `asLibEntrySeparator`.
