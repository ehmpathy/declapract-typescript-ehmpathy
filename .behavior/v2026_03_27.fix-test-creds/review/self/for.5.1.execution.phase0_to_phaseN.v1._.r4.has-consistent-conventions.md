# self-review r4: has-consistent-conventions

## deeper examination

### withKeyrackContext vs codebase patterns

**withDatabaseContext pattern:** higher-order function that wraps production logic to inject context
```typescript
export const withDatabaseContext = <P1, P2, R>(
  logic: (input: P1, context: P2) => R,
) => { return async (input, context) => { ... }; };
```

**withKeyrackContext pattern:** test utility with callback that sets up mocks
```typescript
export const withKeyrackContext = async (
  input: { keys: string[] },
  fn: (context) => Promise<void>,
): Promise<void> => { ... };
```

**verdict:** different purposes. withDatabaseContext is production wrapper; withKeyrackContext is test mock wrapper. pattern holds for test utilities.

### temp directory pattern

**codebase uses genTempDir from test-fns:**
```typescript
import { genTempDir } from 'test-fns';
const tempDir = genTempDir({ slug: 'name', clone: './path' });
```

**withKeyrackContext uses manual fs.mkdtempSync:**
```typescript
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
```

**issue?** genTempDir is for repos that need clone with complex setup (symlinks, assets). withKeyrackContext only needs a temp dir with single keyrack.yml file. manual mkdtemp is appropriate for simple case.

**verdict:** holds. genTempDir overkill for single-file temp setup.

### import style

**codebase convention:**
```typescript
import { existsSync } from 'node:fs';
import { join } from 'node:path';
```

**withKeyrackContext:**
```typescript
import fs from 'node:fs';
import path from 'node:path';
```

**minor inconsistency:** uses default imports instead of named imports.

**verdict:** minor divergence. functionally equivalent. could align but not a blocker.

### comment style

**codebase convention:** jsdoc with `.what` and `.why`

**withKeyrackContext:**
```typescript
/**
 * .what = creates a mock context with keyrack config in a temp directory
 * .why = enables test of buildWorkflowSecretsBlock with different keyrack configs
 */
```

**verdict:** matches convention.

## final verdict

all major conventions followed. one minor inconsistency (default vs named imports) is functionally equivalent and not worth a change.
