# review.self: has-consistent-conventions (r3)

## review for name conventions and patterns

examined the changes against extant conventions in the codebase:

---

### step name conventions

**extant patterns** (from .test.yml):
- `checkout` — lowercase, verb
- `set node-version` — lowercase, hyphenated noun
- `get node-modules from cache` — lowercase, descriptive phrase
- `build` — lowercase, verb
- `test:integration` — lowercase, matches npm command
- `start:testdb` — lowercase, matches npm command

**new step names**:
- `prepare:rhachet` — matches npm command pattern (e.g., `start:testdb`)
- `keyrack firewall` — matches tool name pattern (e.g., `checkout`, `build`)

**verdict**: consistent with extant conventions

---

### comment conventions

**extant patterns**:
```yaml
# .why = keyrack.yml can extend other manifests via symlinks
```

**new comments**:
```yaml
# .why = keyrack firewall translates and validates secrets before tests run
#        - filters to declared keys in keyrack.yml
#        - translates mechanisms (e.g., GitHub App → ghs_* token)
```

**verdict**: follows `.why = ` format from briefs

---

### declapract file conventions

**extant patterns** (from other .declapract.ts files):
```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';
export const check = FileCheckType.EQUALS;
export const fix: FileFixFunction = async (_contents, context) => { ... };
```

**new code**:
```typescript
import { FileCheckType, type FileFixFunction } from 'declapract';
export const check = FileCheckType.EQUALS;
export const fix: FileFixFunction = async (_contents, context) => {
  return { contents: context.declaredFileContents ?? '' };
};
```

**verdict**: consistent with extant patterns

---

### secrets pattern

**extant pattern** (from workflow_call):
```yaml
secrets:
  inherit
```

**new usage**:
```yaml
secrets: inherit  # keyrack firewall in .test.yml filters to declared keys
```

**verdict**: follows GitHub Actions standard pattern with explanatory comment

---

## found issues

none. all new names and patterns match extant conventions:
- step names follow lowercase, npm command, or tool name patterns
- comments use `.why = ` format
- declapract files use standard FileCheckType.EQUALS pattern
- secrets: inherit follows GitHub Actions standard

## why it holds

the changes introduce no new naming conventions. all patterns were derived from:
1. extant step names in .test.yml
2. brief conventions (`.why = `)
3. GitHub Actions standards (`secrets: inherit`)
