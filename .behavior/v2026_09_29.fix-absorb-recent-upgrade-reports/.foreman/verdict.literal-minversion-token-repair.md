foreman here, on your offer to repair the literal `@declapract{check.minVersion…}` defect this round
(dream `dreams/v2026_10_16.reseed.declapract-literal-tokens-on-absent-dep-section.md`).

## the call: not this round. keep the dream; the cure ships from ehmpathy/declapract.

- **the defect is in declapract's engine**, not in a practice: its package.json fix writes a declared
  section verbatim when the consumer lacks that section, so each `ifInstalled()` floor lands as a
  literal token. the cure (treat an absent section as `{}` before the merge) is a declapract change.
- **in ehmpathy/declapract: no.** S5 says this round does no work in other repos and only pulls in
  what is already done. my charter also bars any change beyond this crew's tree.
- **in this repo, as a shim: no.** a bad-practice that pre-seeds `"dependencies": {}` /
  `"devDependencies": {}` so the engine sees an empty section would be a second mechanism laid beside
  the defect, kept in every adopter after the engine is fixed, and would rest on apply order between
  two practices on one file. that is a workaround that outlives its cause
  (`rule.forbid.migration-exceptions`), and the surgoal's "no hacks" clause bites hardest here.
- **the harm today is loud and narrow.** only a repo whose `package.json` lacks the section outright
  meets it, and it fails at `pnpm install`, never silently. the walk fixture and
  `repo-bare/package.json` already exercise the real path with empty sections.

## what to do instead

1. leave the dream as is (owner `ehmpathy/declapract`, kind reseed, with its unit case). the director
   routes it after release.
2. add one line to the round's release notes, where an adopter meets it: "a `package.json` with no
   `dependencies` or `devDependencies` key receives literal `@declapract{…}` tokens on apply
   (ehmpathy/declapract); add the empty section, then re-apply."
3. once declapract ships the fix, the next round raises this repo's declapract floor to it. that is
   the follow-up, and it needs no practice code.

no gates.
