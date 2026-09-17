---
name: define.access
description: access is a PERMISSION you act WITH (test | prep | prod), never a place or tier you act ON — deploy WITH prod access to overwrite prod resources, reach the prod database
type: reference
---

# define.access

## .what

**`access`** (`test | prep | prod`) is the **permission** a process holds — the authority it
carries as it runs. it answers *"which resources am i allowed to touch, and with what weight?"* — not
*"where am i?"*

- you **deploy WITH** an access. `access=prod` → the deploy overwrites the prod resources, reaches
  the prod database, emits to the prod queues.
- you do **not** deploy **TO** or **against** an access. access is the credential in your hand, not
  a destination on a map.

> verbatim, from the human who owns this term:
> - *"its not a tier to deploy into. its an access to deploy with."*
> - *"you deploy with prod access -> overwrite the prod resources, reach the prod database, etc."*

## .the mental model

access is a **key**, not a **room**.

| aspect | wrong (place) | right (permission) |
|---|---|---|
| the noun | a tier you enter | a key you hold |
| the verb | deploy **to** prod, run **against** prep | deploy **with** prod, run **with** prep |
| what it grants | a location | the authority to overwrite prod resources, reach the prod db |

a runtime with `access=prod` may write prod. the same code with `access=prep` may write only prep.
the code is identical; the **access** is what changes what it is permitted to reach. that is why it
is a permission and never a place.

## .why the distinction carries load

- **it names the hazard correctly.** *"deploy with prod access"* reads as *"you hold the prod key —
  be careful"*. *"deploy to prod"* reads as *"you pay a place a visit"*, which understates that the
  same command with a different access overwrites live customer data.
- **it separates the two orthogonal axes.** `access` (which resources you may touch) is independent
  of `server` (where the code runs) — a `local@…` laptop can hold `access=prep`. the "place" frame
  silently conflates the two; the "permission" frame keeps them apart (see
  `define.sdk-environment-shape`).
- **it forecloses the `stage` re-split.** the moment access reads as a place, an author reaches for a
  second word for *"the place's name"* — and that is the `stage`/`access` divergence
  (`rule.forbid.stage-term`). one word for one permission leaves no slot for a second axis.

## .the forbidden synonyms + frames

these are enforced by `rule.forbid.access-permission-not-place`:

| 👎 forbidden | 👍 canonical | why |
|---|---|---|
| `access tier` | `access` | "tier" re-imports the place model the term exists to kill |
| deploy **to** / **into** a tier | deploy **with** an access | access is held, not entered |
| run / act **against** prep | run / act **with** prep access | you carry the permission; you do not aim at it |
| "which tier of resources you touch" | "which resources you may act with/on" | the process holds the access; the resources are what it reaches |
| an **implicit** access mention that never says permission-vs-place | name it plainly: *"with prod access"* | ambiguity is what lets the place model creep back |

## .see also

- `define.sdk-environment-shape` — the `{ access, config, server, commit }` shape; the two-axes split
- `rule.forbid.access-permission-not-place` — the rule this define grounds
- `rule.forbid.stage-term` — the kin rule: access is the one axis, `stage` is the retired second one
- `prefer.env_access.prep_over_dev` (architect) — why `prep`/`prod`, not `dev`
- package: `sdk-environment` (ehmpathy) — `getEnvironment`, `Environment`, `EnvironmentAccessTier`
