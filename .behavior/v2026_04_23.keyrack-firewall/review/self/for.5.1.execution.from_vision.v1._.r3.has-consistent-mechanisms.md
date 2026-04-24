# review.self: has-consistent-mechanisms (r3)

## deeper review for mechanism consistency

examined jest env files that reference keyrack:

---

### jest.integration.env.ts and jest.acceptance.env.ts

**the code**:
```ts
import { keyrack } from '@ehmpathy/rhachet';

// source credentials for local test runs
await keyrack.source({ env: 'test' });
```

**is this duplicative of the firewall?** no — these serve different contexts:

| mechanism | context | when used |
|-----------|---------|-----------|
| `keyrack.source()` | local dev | `npm run test:integration` on dev machine |
| `keyrack firewall` | CI | GitHub Actions workflow |

**why both are needed**:
- local: developer runs tests, needs credentials from local keyrack store
- CI: workflow runs tests, needs credentials from `${{ secrets }}` context

**are they the same mechanism?** no:
- `keyrack.source()` reads from local filesystem (~/.config/rhachet/keyrack/)
- `keyrack firewall` reads from JSON input, writes to `$GITHUB_ENV`

---

### no duplication found

the jest env files are unmodified by this change because:
1. they handle a different usecase (local dev vs CI)
2. they use a different mechanism (`source()` vs `firewall`)
3. they read from different sources (filesystem vs secrets JSON)

this is **complementary**, not **duplicative**.

---

## found issues

none. the local keyrack mechanism (`source()`) and CI keyrack mechanism (`firewall`) serve different contexts with different implementations. no duplication exists.

## why it holds

keyrack has two distinct mechanisms for two distinct contexts:
- local: `keyrack.source()` hydrates from local store
- CI: `keyrack firewall` hydrates from secrets JSON

both are owned by rhachet. neither duplicates the other. the change only affects the CI path.
