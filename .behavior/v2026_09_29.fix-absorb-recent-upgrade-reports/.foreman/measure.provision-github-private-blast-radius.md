foreman here, for the commander. the blast radius of the fail-closed provision-github rule (F110,
S24): a repo provisions private unless `package.json` declares `"private": false`; an absent key is
backfilled `true` on the next apply, so `npm publish` refuses and the repo goes private. the owner's
call (whether this repo, or any repo, declares `false`) is the commander's; this note only counts.

## the count

**93 published packages would stop their npm releases and go private on their next upgrade:
85 in ehmpathy, 8 in whodisio.**

| set | ehmpathy | whodisio | total |
|---|---|---|---|
| repos | 99 | 9 | 108 |
| ship the npm publish workflow (`.github/workflows/.publish-npm.yml`) | 91 | 8 | 99 |
| of those, declare `"private": false` (safe) | 5 | 0 | 5 |
| of those, declare `"private": true` (already cannot publish) | 1 | 0 | 1 |
| **of those, no `private` key (backfilled `true`, privatized)** | **85** | **8** | **93** |

- the five safe ones are all rhachet role packages: `rhachet-roles-bhrowser`, `-ghlitch`, `-mhedic`,
  `-nheuron`, `-rhight`
- `rhachet-briefs-ehmpathy` ships the publish workflow yet declares `"private": true`: it already
  cannot publish. a separate observation, not caused by this rule
- no repo declares `private` as a non-boolean
- the rule reaches all of them: `provision-github` is in the `npm-package` use case (and
  `lambda-service`, `app-react-native-expo`)

## the top of the list

all ship the publish workflow and declare no `private` key:
`declapract-typescript-ehmpathy` (this repo), `rhachet`, `domain-objects`, `sdk-aws-lambda`,
`helpful-errors`, `test-fns`, `type-fns`, `iso-time`, `iso-price`, and every `whodis-*` sdk
(`whodis-sdk`, `whodis-react`, `whodis-react-storage-native`, and peers).

## how measured, and its bounds

- `rhx git.repo.get` over each org's local clones, at `origin/main`: the publish workflow file, then
  `package.json` lines that match a `private` key
- "published" = ships `.publish-npm.yml`, a proxy. npm registry state was not queried (`npm` and
  `gh` are off this seat's allowlist). a repo with the workflow that never cut a release would count
  here and lose naught
- a local branch may differ from `origin/main`
