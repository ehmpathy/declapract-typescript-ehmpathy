# self-review: has-questioned-assumptions

## assumptions surfaced and questioned

### 1. keyrack.source() exists and works as described

| question | answer |
|----------|--------|
| evidence? | wish shows `import { keyrack } from 'rhachet/keyrack'` |
| did wisher say this? | yes, explicit in handoff |
| what if opposite? | we'd need different API |

**verdict**: not an assumption - explicit requirement from wish.

---

### 2. daemon-based session persistence is reliable

| question | answer |
|----------|--------|
| evidence? | wish mentions "once per session" via daemon |
| verified? | no, I haven't tested keyrack daemon |
| counterexamples? | daemon might fail to start on some platforms |

**verdict**: valid concern but out of scope. the wish presents daemon as a feature. if daemon is unreliable, that's a keyrack bug to fix in rhachet, not a declapract concern.

---

### 3. all repos will have rhachet installed

| question | answer |
|----------|--------|
| did wisher say? | not explicitly |
| evidence? | import `{ keyrack } from 'rhachet/keyrack'` would fail if rhachet absent |
| what if opposite? | repos without rhachet would get import errors |

**issue found**: if the jest.env template always imports keyrack, repos without rhachet break.

**fix**: the template should conditionally import keyrack only if keyrack.yml exists:

```typescript
// check before import
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath)) {
  // dynamic import to avoid repos without rhachet from a break
  const { keyrack } = await import('rhachet/keyrack');
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
}
```

wait, re-read the wish handoff - it already does this:

```typescript
if (existsSync(keyrackYmlPath)) {
  keyrack.source({ ... });
}
```

but the import is still at top of file. **the import itself would fail** if rhachet isn't installed.

**solution options**:
1. dynamic import inside the if block
2. try/catch around the import
3. require rhachet as a dev dependency for all repos

the wish doesn't address this. **flag for clarification**.

---

### 4. the owner is always 'ehmpath'

| question | answer |
|----------|--------|
| did wisher say? | yes, example shows `owner: 'ehmpath'` |
| evidence? | ehmpathy keyrack is tied to ehmpath ssh key |
| what if opposite? | other orgs might use different owners |

**non-issue for now**: this is ehmpathy-specific declapract. other orgs would fork and customize.

---

### 5. keyrack.yml existence check is in our code, not keyrack.source()

| question | answer |
|----------|--------|
| evidence? | wish handoff shows `if (existsSync(keyrackYmlPath))` |
| assumption? | I wrote "no keyrack.yml = keyrack.source() is a no-op" |
| truth? | keyrack.source() might throw if no keyrack.yml |

**clarification needed**: is `keyrack.source()` safe to call without keyrack.yml, or do we need the existence check?

the wish shows the existence check, so we should include it. vision is accurate.

---

### 6. mode: 'strict' is correct

| question | answer |
|----------|--------|
| did wisher say? | yes, explicit in handoff |
| what does it do? | presumably fail fast if keys absent |
| alternative? | lenient mode might allow tests to proceed |

**verdict**: follows wish. strict is appropriate for fail-fast behavior.

---

## summary

| assumption | status | notes |
|------------|--------|-------|
| keyrack.source() works | not assumption | wish explicit |
| daemon is reliable | out of scope | keyrack's concern |
| rhachet is installed | **flag** | dynamic import needed |
| owner is ehmpath | ok for ehmpathy | org-specific |
| existence check needed | confirmed | wish shows it |
| strict mode | not assumption | wish explicit |

## action items

1. **flag for blueprint**: handle case where rhachet isn't installed (dynamic import or try/catch)

---

## vision update needed?

add to "open questions":
- how to handle repos without rhachet installed? dynamic import vs try/catch vs require rhachet
