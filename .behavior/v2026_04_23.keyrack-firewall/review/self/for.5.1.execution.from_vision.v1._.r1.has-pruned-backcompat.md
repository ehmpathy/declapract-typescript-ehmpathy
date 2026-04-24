# review.self: has-pruned-backcompat (r1)

## review for backwards compatibility

checked for backwards-compat code that was not explicitly requested:

---

### 1. `secrets: inherit` vs explicit secrets blocks

**the change**: caller workflows now use `secrets: inherit` instead of project-specific secrets blocks

**is this backcompat?** no — this is the requested behavior change

**vision reference**: "remove secrets declaration/env blocks from generated YAML (use `secrets: inherit` in callers)"

**holds**: explicitly requested, not added for safety

---

### 2. FileCheckType.EQUALS vs custom check logic

**the change**: declapract now checks for exact template match instead of generated content

**is this backcompat?** no — this is the requested simplification

**vision reference**: "simplify workflow declapract files — remove slug parse logic"

**what happens to extant projects?**
- `declapract plan` shows the diff
- `declapract fix` updates to new pattern
- this is the intended migration path

**holds**: explicitly requested, not added for safety

---

### 3. projects without keyrack.yml

**concern**: will firewall step fail?

**answer**: no — vision states "project has no keyrack.yml → firewall step is no-op"

**is this backcompat we added?** no — this is firewall's built-in behavior, not something we added

**holds**: firewall handles this edgecase

---

### 4. projects with custom secrets not in keyrack.yml

**concern**: will these secrets be available?

**answer**: yes — `secrets: inherit` passes all secrets. firewall only filters what goes to `$GITHUB_ENV`, but secrets are still available via `${{ secrets.X }}`

**is this backcompat we added?** no — this is how GitHub Actions works

**holds**: no code added for this

---

## backwards-compat code found

none. all changes are explicitly requested in vision. no "to be safe" assumptions were made.

the migration path for extant projects is:
1. `declapract plan` — see diff (secrets blocks removed, firewall step added)
2. `declapract fix` — apply changes
3. push — CI runs with firewall

this is documented in the vision under "timeline".
