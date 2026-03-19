# self-review r2: has-questioned-assumptions (deeper review)

## deeper examination

reviewed the blueprint line by line, searched for hidden assumptions.

---

## assumption.5: reporters array order matters

**what do we assume here without evidence?**
we assume the default reporter should come before the slowtest reporter in the array.

**what if the opposite were true?**
jest processes reporters in order. if slowtest came first, it would still work — but the default output would appear after the slowtest report. this is counterintuitive.

**is this based on evidence or habit?**
evidence — rhachet-roles-ehmpathy places default first, slowtest second. this produces output in the natural order: tests run, summary appears, then slowtest report.

**verdict:** holds — order is intentional for UX

---

## assumption.6: .slowtest/ directory prefix is correct

**what do we assume here without evidence?**
we assume the output path `.slowtest/integration.report.json` uses a `.slowtest/` directory.

**what if the opposite were true?**
we could use `slowtest.report.json` in the root. but this would clutter the root directory.

**is this based on evidence or habit?**
evidence — rhachet-roles-ehmpathy uses `.slowtest/` directory. the dot prefix hides it in file browsers. subdirectory keeps reports organized.

**could a simpler approach work?**
root file would be simpler but messier. directory approach is cleaner.

**verdict:** holds — directory approach is cleaner

---

## assumption.7: no declapract.ts file needed for jest.integration.config.ts

**what do we assume here without evidence?**
we assume the jest.integration.config.ts can be a plain template file without a `.declapract.ts` companion.

**what if the opposite were true?**
a `.declapract.ts` would allow CONTAINS semantics (check parts of file). but jest config is typically replaced wholesale on upgrades.

**is this based on evidence or habit?**
evidence — the extant `jest.integration.config.ts` in best-practice has no `.declapract.ts` companion. it uses plain template semantics (full overwrite).

**verdict:** holds — plain template is correct for this case

---

## summary (r2)

deeper review found three more assumptions. all hold under scrutiny.

| assumption | verdict | rationale |
|------------|---------|-----------|
| reporters order | holds | UX flow: tests → summary → slowtest |
| .slowtest/ directory | holds | cleaner than root file |
| no .declapract.ts | holds | plain template is standard for config files |
