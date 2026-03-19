# self-review r3: has-pruned-backcompat

## scan for backwards compatibility concerns

reviewed the blueprint for any backwards compatibility shims or fallbacks.

---

## concern.1: jest.integration.config.ts is a full overwrite

**what happens to projects with custom jest config?**
declapract uses plain template semantics — the entire file is replaced on apply.

**is there backwards compat built in?**
no — and this is intentional. projects that need custom config can override the entire file.

**was this explicitly requested?**
the wish says "like rhachet-roles-ehmpathy" — rhachet-roles-ehmpathy uses full overwrite.

**verdict:** no backwards compat concern. full overwrite is the extant pattern.

---

## concern.2: test-fns minVersion bump from 1.7.2 to 1.15.7

**what happens to projects on 1.7.2?**
they will be flagged by declapract validation and prompted to upgrade.

**is this a break?**
no — test-fns 1.15.7 is backwards compatible with 1.7.2 API.

**was backwards compat explicitly requested?**
no — the wish asks for "latest version".

**verdict:** no backwards compat concern. minVersion bump is standard practice.

---

## concern.3: .gitignore new entry

**what happens to projects without the entry?**
declapract fix will add it automatically via the sortable ignores mechanism.

**is there any backwards compat shim?**
no — and none needed. an ignore entry is additive, not a break.

**verdict:** no backwards compat concern. additive change.

---

## summary

no backwards compatibility concerns found in the blueprint.

| concern | backwards compat needed? | rationale |
|---------|-------------------------|-----------|
| jest config overwrite | no | extant pattern, wisher-confirmed |
| test-fns version bump | no | API is backwards compatible |
| gitignore entry | no | additive change |

no open questions to flag — all changes are forward-only with no special shims.
