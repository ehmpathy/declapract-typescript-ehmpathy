# review.self: has-consistent-conventions (r4)

## deeper review for consistent conventions

examined specific patterns with fresh eyes:

---

### environment variable names

**extant patterns** (from workflows):
- `GITHUB_TOKEN` — SCREAMING_SNAKE_CASE
- `COMMIT_MSG` — SCREAMING_SNAKE_CASE
- `PAGERDUTY_INTEGRATION_KEY` — SCREAMING_SNAKE_CASE

**new env var**:
- `SECRETS_JSON` — SCREAMING_SNAKE_CASE

**verdict**: follows extant SCREAMING_SNAKE_CASE convention

---

### workflow step placement

**extant order** (in test-shards-integration):
1. checkout
2. set node-version
3. get node-modules from cache
4. (aws auth)
5. start:testdb
6. build
7. test:integration

**new order**:
1. checkout
2. set node-version
3. get node-modules from cache
4. prepare:rhachet ← new
5. keyrack firewall ← new
6. get aws auth
7. start:testdb
8. build
9. test:integration

**is this correct?** yes:
- prepare:rhachet needs node_modules (comes after cache restore)
- firewall needs keyrack.yml symlinks (comes after prepare:rhachet)
- firewall must run before any step that uses secrets (before aws auth)

**verdict**: placement follows logical dependency order

---

### comment structure

**extant pattern** (from .test.yml line 68):
```yaml
- name: build
  run: npm run build # build before test:types, to ensure .dist/ artifacts are importable for blackbox tests
```

**new comments**:
```yaml
# .why = keyrack firewall translates and validates secrets before tests run
#        - filters to declared keys in keyrack.yml
```

**observation**: extant uses inline `#` comments, new uses multi-line `.why =` block comments.

**is this inconsistent?** no — different purposes:
- inline `#` for brief notes on same line
- `.why = ` block to explain a step's purpose

both patterns exist in the codebase. the `.why = ` format is from ehmpathy briefs and matches what PR #344 uses in rhachet.

---

### secrets: inherit comment

**new code**:
```yaml
secrets: inherit # keyrack firewall in .test.yml filters to declared keys
```

**is inline comment appropriate?** yes — brief explanation of why inherit is safe.

---

## found issues

none. all conventions align with extant patterns:

| convention | extant | new | match |
|------------|--------|-----|-------|
| env vars | SCREAMING_SNAKE_CASE | SECRETS_JSON | ✓ |
| step names | lowercase | lowercase | ✓ |
| step order | logical deps | logical deps | ✓ |
| block comments | .why = | .why = | ✓ |
| inline comments | # brief | # brief | ✓ |

## why it holds

each convention was derived from extant patterns in the codebase. no new conventions were introduced. the `.why = ` format comes from ehmpathy briefs and is used in rhachet PR #344, which this change integrates with.
