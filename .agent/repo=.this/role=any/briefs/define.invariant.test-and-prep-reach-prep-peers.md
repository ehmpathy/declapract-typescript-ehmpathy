---
name: define.invariant.test-and-prep-reach-prep-peers
description: in this org's deploy topology a runtime in test OR prep access reaches the same shared prep peer fleet (and thus the shared prep livedb); only prod is self-contained
type: invariant
---

# define.invariant.test-and-prep-reach-prep-peers

## .what

a runtime in **`test`** access and a runtime in **`prep`** access reach the **same** peer services —
the ones deployed to `prep`. only **`prod`** access is self-contained. so a `test`-access suite fans
out to prep peers exactly as a `prep`-access one does, and both require the shared prep
aurora-serverless livedb to be awake.

## .kind

**nurture** — a deployment-topology choice, not a law of nature. this org runs ONE shared non-prod
cluster (`prep`) and ONE shared non-prod peer fleet; there is no separate `test` fleet for a service
to call. a `test`-access runtime therefore borrows prep's peers. a parallel test fleet could be stood
up; we chose not to (its cost exceeds the shared-cluster flake it would remove). so this holds
because we decided it, and still decide it.

## .invariant

```
access ∈ {test, prep}  ⟹  the runtime reaches prep peer services (and thus the shared prep livedb)
```

equivalently: **only `prod` is self-contained; `test` and `prep` both fan out to `prep`.**

## .why

the shared prep aurora-serverless-v2 cluster idles to min-capacity 0 and auto-pauses. the first
downstream query after a pause cold-starts past the suite timeout and flakes it. a livedb wake before
the suite prevents that flake — but ONLY if it fires for every access that reaches prep. gate the wake
on `access === 'prep'` alone and every `test`-access suite that calls a db-backed prep peer flakes on
its first query, because it reaches the same paused cluster. the correct gate is
`access ∈ {test, prep}`.

this is the reason the livedb wake fires for prep OR test access, not prep alone. it is a distinct
concern from a service's OWN local testdb: the testdb is this repo's own db (a local preflight gated
on a declared db), the livedb is the shared prep cluster its peers query (a wake gated on access).

## .scope

- covers: which accesses reach the shared prep cluster — and therefore which must wake it.
- does NOT cover: `prod` (self-contained; never scales to 0; never woken).
- does NOT cover: a service's OWN local testdb — that preflight is gated on a declared db, not on
  access.

## .the counter-argument

*"a test-access run should hit a test fleet, not prep — so it should never touch the prep cluster."*
true in an org that runs a separate test fleet. this org does not: to stand up + maintain a parallel
non-prod fleet costs more than the shared-cluster flake it would remove. until that trade flips,
`test` borrows `prep`.

## .what would overturn it

- a separate `test`-access peer fleet is stood up → `test` reaches `test`, not `prep`, and the wake
  gate drops back to `access === 'prep'` alone.
- prep no longer auto-pauses (a min-capacity floor above 0) → no one needs a wake, and the whole
  livedb wake retires.

## .enforcement

- a livedb wake gated on `access === 'prep'` (that omits `test`) = **blocker** — a test-access suite
  that calls a db-backed prep peer will flake on its first query.
- a claim that `test` access is self-contained (needs no prep) = **blocker** — false under this
  topology.

## .see also

- `define.access` — `access` is a permission you act WITH (`test | prep | prod`), never a place.
- the **livedb wake** helper (`useWakeOfLivedb`) — fires on `access ∈ {test, prep}`; wakes the shared
  prep cluster.
- the **testdb preflight** helper (`useWakeOfTestdb`) — the LOCAL own-db counterpart, gated on a
  declared db, not on access.
