# self-review r7: role-standards-adherance

## briefs categories examined

checked these directories in `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`:

| directory | relevance |
|-----------|-----------|
| `code.prod/evolvable.procedures/` | buildWorkflowSecretsBlock uses (input, context) |
| `code.prod/pitofsuccess.errors/` | keyrack.source() fail-fast pattern |
| `code.prod/readable.comments/` | jsdoc .what/.why headers |
| `code.prod/readable.narrative/` | flat code flow |
| `code.prod/pitofsuccess.typedefs/` | as-cast at boundary |
| `lang.terms/` | no gerunds, no forbidden terms |
| `lang.tones/` | lowercase preference |

---

## deep examination by file

### buildWorkflowSecretsBlock.ts

#### rule.require.input-context-pattern

```typescript
export const buildWorkflowSecretsBlock = async (
  input: { template: string },
  context: { getProjectRootDirectory: () => string },
): Promise<string> => {
```

**why it holds:**

1. **first arg is `input`**: contains the data to operate on (`template`)
2. **second arg is `context`**: contains the dependency (`getProjectRootDirectory`)
3. **both are typed objects**: enables autocomplete, type safety
4. **returns Promise<string>**: explicit return type, not inferred

the rule states: "functions accept one input arg (object) and optional context arg (object)". this function does exactly that. the `template` is what we transform; the `context` provides file system access.

#### rule.require.what-why-headers

```typescript
/**
 * .what = builds workflow content with keyrack secrets block for .test.yml
 * .why = single source of truth for test.yml, publish.yml, deploy.yml check+fix
 */
```

**why it holds:**

1. **`.what`**: one line, describes the action ("builds workflow content...")
2. **`.why`**: explains rationale ("single source of truth...")
3. **no `.note`**: optional, not needed here

the rule states: ".what and .why mandatory, 1-3 lines max". both present, both concise.

#### rule.require.narrative-flow

**structure of function body:**

```
line 15-19: check keyrack.yml exists → early return
line 22-26: get keys → early return if empty
line 28-34: extract key names
line 36-39: build secrets block
line 41-45: apply regex replacement
```

**why it holds:**

1. **flat structure**: no nested if/else
2. **early returns**: two guard clauses with `return input.template`
3. **code paragraphs**: each block has comment header
4. **no else branches**: guards use early return

the rule states: "eliminate if/else and nested if blocks; use early returns". this function uses `if (!x) return` pattern twice, then proceeds to main logic.

#### rule.forbid.as-cast exception

```typescript
const keys = (await keyrack.get({
  for: { repo: true },
  env: 'test',
})) as KeyrackGrantAttempt[];
```

**why this is acceptable:**

1. **external org boundary**: rhachet is an external package
2. **documented**: comment explains the 4-variant union
3. **type information**: the sdk doesn't expose precise return type

the rule states: "allowed only at external org code boundaries; must document via inline comment". the comment at lines 29-31 documents why the cast is needed and what the type means.

---

### jest.integration.env.ts

#### rule.require.fail-fast

```typescript
if (existsSync(keyrackYmlPath))
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

**why it holds:**

1. **`mode: 'strict'`**: keyrack throws immediately if locked or keys absent
2. **throws before tests run**: jest setup file executes before any test
3. **actionable errors**: keyrack error includes exact fix commands

the rule states: "enforce early exits... for invalid state". strict mode causes immediate throw with helpful message, preventing silent failures.

#### code paragraph structure

```typescript
/**
 * .what = source credentials from keyrack for test env
 * .why =
 *   - auto-inject keys into process.env
 *   - fail fast with helpful error if keyrack locked or keys absent
 */
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath))
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

**why it holds:**

1. **jsdoc before code paragraph**: .what/.why header present
2. **3 lines of code**: concise block
3. **single responsibility**: only handles keyrack credential injection

---

### package.json (tests best-practice)

#### rule.require.safe-shell-vars

```json
"test:unit": "set -eu && jest ... $([ -n \"${CI:-}\" ] && echo '--ci') ..."
```

**why it holds:**

1. **`set -eu`**: enables fail-fast (`-e`) and unset var error (`-u`)
2. **`${CI:-}`**: provides empty default, satisfies `-u`
3. **`${THOROUGH:-}`**: same pattern
4. **`${RESNAP:-}`**: same pattern

the rule states: "use `${VAR:-}` syntax for optional env vars". all three conditional vars use this syntax. the `-u` flag would fail on bare `$CI` but passes with `${CI:-}`.

---

### bad-practice .declapract.ts files

#### rule.require.arrow-only

```typescript
export const fix: FileFixFunction = () => {
  return { contents: null };
};
```

**why it holds:**

1. **arrow syntax**: `() => { ... }`
2. **no function keyword**: not `function fix() { ... }`
3. **const assignment**: `export const fix = ...`

the rule states: "use arrow syntax; never use function keyword". this follows exactly.

#### rule.require.single-responsibility

**use.apikeys.sh.declapract.ts:**
- one check: FileCheckType.EXISTS
- one fix: return null to delete

**use.apikeys.json.declapract.ts:**
- same pattern

**why it holds:** each file exports exactly one check and one fix. no utilities, no shared state, no side responsibilities.

---

### .test.yml workflow

#### name conventions (lang.terms)

step names in workflow:
- `prepare:rhachet` - noun:noun structure
- `get node-modules from cache` - verb noun prep noun

**why it holds:**

1. **no gerunds**: not "preparing" or "getting"
2. **action verbs**: "get", "prepare"
3. **descriptive**: clear what step does

---

## potential violations examined and cleared

| pattern | examined | result |
|---------|----------|--------|
| gerunds in code | searched all files | none found |
| else branches | checked flow | none present |
| function keyword | checked declarations | all use arrow |
| bare $VAR | checked shell commands | all use ${VAR:-} |
| uncast external types | checked imports | documented cast |
| absent jsdoc | checked procedures | all have headers |

---

## summary

reviewed all changed files against mechanic briefs. each file follows the patterns:

1. **buildWorkflowSecretsBlock.ts**: (input, context) pattern, jsdoc, narrative flow, documented as-cast
2. **jest.*.env.ts**: fail-fast via strict mode, jsdoc header
3. **package.json**: safe shell vars with `${VAR:-}` syntax
4. **bad-practice files**: arrow-only, single responsibility
5. **.test.yml**: noun-based step names

no violations found. all patterns hold.

