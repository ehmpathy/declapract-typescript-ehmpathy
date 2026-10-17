# rule.forbid.fail-open-publicity

## .what

every visibility or exposure default **fails closed**: private. public is an explicit, per-repo
opt-in — `"private": false` in the repo's own `package.json` — and never an inference from an
absent key.

to publish a repo is a deliberate act, made by someone ready to fullsun that domain. a default
never makes it for them.

## .why

- **privacy is top priority.** a public repo ships its code, its history, its issues, and every
  name and detail in them to every reader, forever. a fork or a clone cannot be recalled.
- **a fail-open default publishes by omission.** an absent key is the commonest state of a fresh
  `package.json`, so a default that reads absence as public exposes the repos nobody decided on.
- **the two errors are not symmetric.** a repo wrongly private costs one line to open. a repo
  wrongly public cannot be made unseen.
- **only the domain owner can judge readiness.** whether a domain is ready to fullsun is a call
  about its content and its people. a template cannot make that call, so it must not make it by
  default.

## .the test

> **if the flag is absent, null, unknown, or unreadable — what does this produce?**

- private → fails closed. correct
- public → fails open. forbidden

the only path to public is a value that says so explicitly.

| input | result |
|-------|--------|
| `"private": false` | public |
| `"private": true` | private |
| key absent | private |
| `null`, a string, any other value | private |
| `package.json` unreadable | private, or fail loud — never public |

## .examples

### 👎 fails open

```ts
// provision-github resources.ts — an absent key provisions a PUBLIC repo
visibility: pkg.private === true ? 'private' : 'public',
```

### 👍 fails closed

```ts
// public only by an explicit `"private": false`
visibility: pkg.private === false ? 'public' : 'private',
```

the consequence, stated plainly: a repo meant to be public owes `"private": false` in its
`package.json`. without it, its next provision apply makes it private. that is the safe direction,
and a one-line fix.

## .the key is always explicit

an implicit key leaves the declared visibility and the provisioned one free to disagree. so
`package.json` always declares `private` as a boolean, in sync with the repo. where the key is
absent or not a boolean, a backfill writes `"private": true` — the closed value — and never
touches an explicit `true` or `false` (provision-github's `implicit-package-privacy`).

`"private": true` also makes `npm publish` refuse. a published package declares `"private": false`
by its owner's hand; its next publish fails loud until it does, which is the safe direction.

## .what a practice may not do

- declare `"private": false` on an adopter's behalf — the opt-in belongs to the repo owner alone
- default any other exposure (a public bucket, an open endpoint, a public package access, a public
  environment) to open where the input is absent
- read a parse failure, a typo, or an unknown value as consent to publish

## .enforcement

- a visibility or exposure default that resolves to public on an absent or unknown input =
  **blocker**
- a practice that declares `"private": false` (or any public opt-in) for an adopter = **blocker**
- a public opt-in inferred from aught but an explicit per-repo value = **blocker**
- a backfill that writes a public value, or that overwrites an explicit `true`/`false` = **blocker**

## .see also

- `rule.forbid.timestamp-hook-exemptions` — the same privacy-first stance, for timestamps
- `rule.forbid.copium` — fix the cause at its owner; the repo owner owns its publicity
