# review.self: has-ergonomics-validated (r8)

## question: does the implementation match the planned ergonomics?

### where are the ergonomics specified?

no repros artifact exists for this PR. the vision document describes the expected input/output.

### comparison: vision vs implementation

#### firewall step syntax

**vision specified:**
```yaml
- name: keyrack firewall
  run: npx rhachet keyrack firewall --env test --from 'json(env://SECRETS_JSON)' --into github.actions
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}
```

**implementation (.test.yml lines 214-217):**
```yaml
- name: keyrack firewall
  run: npx rhachet keyrack firewall --env test --from 'json(env://SECRETS_JSON)' --into github.actions
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}
```

**match**: exact.

#### caller workflow

**vision specified:**
```yaml
secrets: inherit  # or explicit secrets block
```

**implementation (test.yml line 25):**
```yaml
secrets: inherit # keyrack firewall in .test.yml filters to declared keys
```

**match**: exact, with clarification comment added.

#### what the firewall does

**vision described:**
1. reads keyrack.yml to know which keys belong to this env
2. filters input to only declared keys (security boundary)
3. translates mechanisms (GitHub App → ghs_* token)
4. validates patterns (blocks ghp_*, AKIA*)
5. exports to $GITHUB_ENV with proper mask

**implementation assumes:**
- the firewall command in rhachet does all of the above
- declapract just invokes it correctly

this is correct: declapract provides the template, rhachet provides the behavior.

---

## found issues

none.

## why it holds

### implementation matches vision exactly

the template syntax matches the vision specification character-for-character. no drift occurred.

### added clarity

the implementation added a comment:
```yaml
secrets: inherit # keyrack firewall in .test.yml filters to declared keys
```

this is an improvement — future developers understand why inherit is used.

### ergonomics preserved

| aspect | vision | implementation |
|--------|--------|----------------|
| firewall command | exact match | exact match |
| env block | exact match | exact match |
| step name | exact match | exact match |
| caller pattern | inherit | inherit + comment |

### conclusion

the implementation matches the planned ergonomics from the vision. the only drift is an added comment, which improves clarity without change to behavior.

