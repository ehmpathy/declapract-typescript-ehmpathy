# S24 — repo visibility fails closed; public only by explicit opt-in

## .said

> default should always be private, if not explicitly public. fail closed;     visibility: pkg.private === true ? 'private' : 'public', // `private` derives from this

> enrule this and forbid fail open publicity. privacy is top priority. only folks ready to fullsun a specific domain should ever be fullsunned via a public repo

> well, we should also backfill the package.json to explicitly say false by default now too

> so that they're always explicitly in sync

> (err, true. backfill it whenever its not explicit)

asked which value the backfill writes where the key is absent, the wisher chose `"private": true`.

## .settled

- every visibility or exposure default fails closed to private
- a repo is public only by an explicit `"private": false` in its own `package.json`; an absent,
  null, unknown, or unreadable value yields private
- no practice declares a public opt-in on an adopter's behalf; to publish is the domain owner's
  deliberate act
- a repo meant to be public that omits the key goes private on its next provision apply — the safe
  direction
- `package.json` always declares `private` as an explicit boolean, so the declared visibility and
  the provisioned one stay in sync. where the key is absent or not a boolean, the backfill writes
  `"private": true`; an explicit `true` or `false` is never touched

## .landed

- `P/provision-github/best-practice/provision/github.repo/resources.ts` (fail-closed visibility) + its test
- `rule.forbid.fail-open-publicity`
- F109
- `P/provision-github/bad-practices/implicit-package-privacy/package.json.declapract.ts` (+ unit
  test), `P/provision-github/implicit-package-privacy.declapract.integration.test.ts` (+ fixture
  `P/provision-github/.test/assets/demo-repo-implicit-privacy/`), the provision-github readme
- F110
