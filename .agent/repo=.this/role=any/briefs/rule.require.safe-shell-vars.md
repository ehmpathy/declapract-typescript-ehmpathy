# rule.require.safe-shell-vars

## .what

use `"${VAR:-}"` syntax for optional env vars in shell scripts

## .why

shell variable expansion has multiple layers of correctness:

| syntax | behavior when VAR unset | with `set -u` |
|--------|------------------------|---------------|
| `$VAR` | empty string, word split | error |
| `"$VAR"` | empty string, no split | error |
| `"${VAR:-}"` | empty string, no split | ok |
| `"${VAR:-default}"` | "default" | ok |

the `:-` operator provides a default value (empty string if omitted), which satisfies `set -u` (nounset) while correct boolean logic remains intact.

## .the bug this prevents

### shell syntax issues

```bash
# BROKEN: when RESNAP is unset, becomes [ -n ] which is TRUE
[ -n $RESNAP ] && echo '--updateSnapshot'

# BROKEN: fails with "RESNAP: unbound variable" under set -u
[ -n "$RESNAP" ] && echo '--updateSnapshot'

# SAFE for syntax: returns empty string when unset, [ -n "" ] is FALSE
[ -n "${RESNAP:-}" ] && echo '--updateSnapshot'
```

### boolean semantics issues

the `-n` (non-empty) check has incorrect boolean semantics:

| RESNAP value | `[ -n "${RESNAP:-}" ]` | `[ "${RESNAP:-}" = "true" ]` |
|--------------|------------------------|------------------------------|
| unset        | false (correct)        | false (correct)              |
| `""`         | false (correct)        | false (correct)              |
| `"true"`     | true (correct)         | true (correct)               |
| `"false"`    | **true (wrong!)**      | false (correct)              |
| `"0"`        | **true (wrong!)**      | false (correct)              |

```bash
# BAD: RESNAP=false still triggers --updateSnapshot
[ -n "${RESNAP:-}" ] && echo '--updateSnapshot'

# GOOD: explicit equality check, only triggers on exact "true"
[ "${RESNAP:-}" = "true" ] && echo '--updateSnapshot'
```

## .pattern

### conditional flags in package.json commands

```json
{
  "commands": {
    "test:unit": "set -eu && jest $([ -n \"${CI:-}\" ] && echo '--ci') $([ \"${THOROUGH:-}\" != \"true\" ] && echo '--changedSince=main') $([ \"${RESNAP:-}\" = \"true\" ] && echo '--updateSnapshot')"
  }
}
```

- `CI`: use `-n` (non-empty check) since CI systems set this to various truthy values (`"true"`, `"1"`, etc.)
- `THOROUGH`, `RESNAP`: use explicit equality check (`= "true"` or `!= "true"`) for correct boolean semantics

### multi-line CI workflow steps

```yaml
- name: run tests
  run: |
    set -eu
    if [[ -n "${DEBUG:-}" ]]; then
      echo "debug mode"
    fi
    npm run test
```

## .common env vars

| var | purpose |
|-----|---------|
| `CI` | true in CI environments |
| `THOROUGH` | run all tests, not just changed |
| `RESNAP` | update snapshots |
| `DEBUG` | enable debug output |

## .defense in depth

use both:
1. `set -eu` at the start of shell scripts (fail on error + unset var)
2. `${VAR:-}` for all optional env vars (provide default)

this catches issues at multiple layers.

## .enforcement

- unquoted vars (`$VAR`) in test scripts = blocker
- quoted without default (`"$VAR"`) = blocker
- absent `set -eu` in CI workflow scripts = blocker

## .see also

- bad-practice `unquoted-shell-vars-in-test-scripts` — detects and fixes this
- shellcheck SC2086 (word split) and SC2154 (unset variable)
