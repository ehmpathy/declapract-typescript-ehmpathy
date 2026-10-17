foreman here, on the 38 blockers you disputed in 5.1 round i004, and on #650 under the #51 rules.

the tally reconciles: 42 blockers across 8 rejecters = 4 repaired (r004 b1, r009 b18, r009 b19,
r027 b1) + 38 disputed. the allowance and the round count are the commander's; this note rules
only on which disputes stand.

## verdict: 37 stand, 1 is a real defect

### the real defect — r010 b5, fix it

`src/practices/tests-node/best-practice/src/.test/useKeyrack.ts:215-217` ships to every adopter:

    const requiresAwsAuth = (
      readText({ path: join(cwd, 'declapract.use.yml') }) ?? ''
    ).includes('awsAccountId');

your taken says every r010 site sits behind a name. this one does not: it is inline, in the
orchestrator. and it is worse than decode friction, because it gates the #611/#612 security fix
(the imds bar and strict mode):
- a comment or an unrelated key that holds the text `awsAccountId` turns strict mode on where it
  does not belong;
- an aws declaration the scan does not see leaves the imds bar off, and the dev box borrows the
  instance role in silence — the exact wall #611/#612 closed.

that is a nameable shipped harm (security), so it is a blocker on its merit.

the fix:
- a named leaf in the template, e.g. `isAwsAuthDeclared({ useYmlText })`, that reads the KEY, not
  any text match: a line-anchored `^\s*awsAccountId\s*:` with a non-empty value, or a yaml parse if
  the tests-node usecase already declares `yaml`. no new dependency for this alone.
- clamps, red on the current line: (a) a `# awsAccountId` comment alone → false; (b) a key such
  as `awsAccountIdLegacy:` → false; (c) `awsAccountId: '123'` under `variables:` → true;
  (d) absent file → false. keep the extant useKeyrack cases green.
- resync this repo's self-applied copy if one exists, then the tests-node snapshots.

### the 37 that stand

- **withdrawn by the reviewer itself (3):** r003 b1, r003 b2, r006 b1. the report's own text
  withdraws each. stand.
- **a rule applied outside its scope (1):** r001 b4. `*/` closes a block comment in `.ts`; a bash
  `#` comment has no terminator. stand.
- **declaration-side refs (2):** r001 b2, b3. a `.declapract.ts` jsdoc or a `.declapract.readme.md`
  never reaches an adopter tree; `rule.forbid.source-refs-in-template-comments` sends such notes
  there. stand.
- **the husky halt command (1):** r001 b1. `npx declapract apply --practice husky` resolves the
  adopter's own devDependency, uses a real verb, and restores the locked hook. stand.
- **the hook header shape (1):** r004 b2. `rule.avoid.hazard-pitch-prose` is an `avoid`, so a
  nitpick by its own directive, and S16 sets the loud privacy header as policy. stand, at nitpick.
- **decode friction in this repo's own declaration and util code (25):** r009 b1–b6, b9, b12–b17;
  r010 b1–b4, b6–b10. each site sits in a named leaf or a declaration's fix, code that runs inside
  declapract and never ships to an adopter. readability only, no shipped harm
  (`rule.forbid.overzealous-blockers`). stand, at nitpick.
- **shell templates (4):** r009 b7, b8, b10, b11. I read check.secrets.sh: the grep reads the blob
  on stdin, so `cut -d: -f1` takes the line number, never a filename, and `read`'s last var keeps
  the regex's own `|` intact. check.timestamps.sh is locked (S16). the testdb scripts carry named
  pairs and a title comment. no harm. stand, at nitpick.
- **coverage owned by another stage (3):** r030 b1 (closures live in the pr body, S17), b2
  (critipath proof is owed at 5.3), b3 (a bad-practice fix is never called on an absent file).
  stand. but if the `!contents` branch in that fix is truly unreachable, delete it rather than
  keep dead code (scouts).

### the lesson for your takens

r010's taken refuted ten points as one class with the line "these are those names". one of the
ten was not. a class refutation must cite each site's file:line, or it hides the one that differs.
write the next one per site.

## #650 under the #51 rules (provisional)

the #51 foreman's two rules — `rule.require.end-state-design` and
`rule.forbid.migration-exceptions` — are not readable from this seat (the /tmp guard blocks the
read; the #51 tree serves only their headers). the principle and the source incident are known:
design for the end state, not the migration; the #51 foreman bent the sdk's contemp body to spare
#650's migration, and the human overruled it.

the ancient pin holds, but on a different reason than F39 states:
- **the reason that holds:** an api gateway endpoint in production receives the raw api gateway
  frame. that IS the ancient payload struct. a test that pins it calls the handler the way
  production calls it — explicit intent, and the end state.
- **the reasons that fail the new rules:** "dodge the 0.7.1 500" (a pin around a defect, which the
  surgoal forbids) and "the bridge across #51" (a migration frame). F39 must state the first
  reason only.
- **so the fast follow changes shape.** it is not "drop the pin after #51". under end-state design
  the pin stays, because ancient is the production wire. the fast follow, if any, is only: remove
  the F39 / codemod prose that ties the pin to #51.

the three owed items in `verdict.650-ancient-pin-vs-51.md` still hold (close the two pin gaps;
update F39; the dream), with items 2 and 3 revised per above. hold the dream's text until the
human confirms this reframe, since the human confirmed the earlier fast-follow shape.
