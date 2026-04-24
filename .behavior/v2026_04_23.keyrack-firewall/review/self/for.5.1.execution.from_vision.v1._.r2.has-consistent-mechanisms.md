# review.self: has-consistent-mechanisms (r2)

## review for mechanism consistency

checked for new mechanisms that duplicate extant functionality:

---

### mechanisms removed (not duplicated)

| removed | reason |
|---------|--------|
| `buildWorkflowSecretsBlock.ts` | replaced by firewall runtime behavior |
| `withKeyrackContext.ts` | test helper for removed code |
| slug parse logic in .test.yml.declapract.ts | replaced by FileCheckType.EQUALS |

---

### mechanisms used (all extant)

| mechanism | source | purpose |
|-----------|--------|---------|
| `npx rhachet keyrack firewall` | rhachet PR #344 | runtime secret filter |
| `FileCheckType.EQUALS` | declapract | exact template match |
| `secrets: inherit` | GitHub Actions | pass all secrets to callee |
| `npm run X --if-present` | npm | graceful skip if command absent |

---

### new mechanisms added

**count**: zero

this change REMOVES mechanisms and replaces them with extant ones:
- buildWorkflowSecretsBlock.ts (114 lines) → firewall (1 line invoke)
- custom check function (114 lines) → FileCheckType.EQUALS (1 line)
- test infrastructure (50+ lines) → deleted (no replacement needed)

---

### verification: no duplication

**firewall command**: is there another way to filter secrets in this codebase?
- no — this is the only mechanism for secret filter at runtime
- the old approach was build-time injection, which is gone

**FileCheckType.EQUALS**: is there another way to check exact match?
- no — this is the standard declapract approach
- the old custom check was a workaround for build-time secrets

**secrets: inherit**: is there another way to pass secrets?
- yes — explicit secrets blocks
- but `secrets: inherit` is simpler and matches vision goal

---

## found issues

none. no new mechanisms were introduced. all changes use extant mechanisms from rhachet, declapract, or GitHub Actions.

## why it holds

this change is a simplification, not an addition. it removes custom mechanisms and replaces them with standard ones:
- rhachet firewall (runtime filter) vs buildWorkflowSecretsBlock (build-time inject)
- FileCheckType.EQUALS (standard) vs custom check function (custom)
- secrets: inherit (standard) vs explicit secrets blocks (generated)
