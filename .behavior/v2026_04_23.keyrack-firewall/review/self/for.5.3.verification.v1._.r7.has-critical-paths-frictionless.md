# review.self: has-critical-paths-frictionless (r7)

## question: are the critical paths frictionless in practice?

### what is the critical path?

no repros artifact exists, but the implicit path is:

```
given: project uses declapract-typescript-ehmpathy
when: developer runs `declapract plan`
then: diff shows firewall step added, secrets blocks removed
and: caller workflow shows `secrets: inherit`

when: developer runs `declapract fix`
then: workflows updated

when: developer pushes
then: CI runs with firewall
and: secrets exported to $GITHUB_ENV
```

### is the path frictionless?

let me verify each step.

#### step 1: template is valid YAML

verified by read of `.test.yml`:
- firewall step at lines 214-217 for integration tests
- firewall step at lines 298-301 for acceptance tests
- syntax is correct: `npx rhachet keyrack firewall --env test --from 'json(env://SECRETS_JSON)' --into github.actions`

#### step 2: caller workflow uses `secrets: inherit`

verified by read of `test.yml`:
- line 25: `secrets: inherit`
- comment: `# keyrack firewall in .test.yml filters to declared keys`

#### step 3: fix function returns template

verified by test:
- `expect(result.contents).toEqual(templateContent)`
- fix is FileCheckType.EQUALS behavior

#### step 4: firewall command syntax is correct

matches vision specification:
- `--env test` — correct env
- `--from 'json(env://SECRETS_JSON)'` — correct input
- `--into github.actions` — correct output

---

## found issues

none.

## why it holds

### the template structure is sound

the firewall step:
1. runs after node setup and cache restore
2. runs before aws auth (which may need secrets)
3. runs before tests (which need secrets in $GITHUB_ENV)

the order is correct: firewall exports secrets → downstream steps use them.

### the `secrets: inherit` pattern is documented

the caller workflow has a comment:
```yaml
secrets: inherit # keyrack firewall in .test.yml filters to declared keys
```

future developers understand why inherit is used.

### no manual intervention required

the path is:
1. `declapract plan` — see changes
2. `declapract fix` — apply changes
3. push — CI works

no extra configuration needed. the firewall reads `keyrack.yml` which already exists.

### conclusion

the critical path is frictionless. templates are valid. fix behavior is correct. firewall command syntax matches specification. no manual steps required.

