# self-review r3: has-consistent-conventions

## examination

searched for function name patterns: `^(export )?(const|function) (get|build|with)[A-Z]`

### codebase conventions found

| pattern | examples |
|---------|----------|
| `get*` | getStage, getEnvironment, getConfig, getDatabaseConnection, getKeyrackKeys |
| `build*` | buildWorkflowSecretsBlock, buildExpectedContent |
| `with*Context` | withDatabaseContext, withDatabaseTransaction, withKeyrackContext |

### names I introduced

| name | convention | matches? |
|------|------------|----------|
| `withKeyrackContext` | `with*Context` | yes - matches withDatabaseContext |
| `getKeyrackKeys` | `get*` | yes - matches getConfig, getStage |
| `buildExpectedContent` | `build*` | yes - matches buildWorkflowSecretsBlock |
| `keyrackYmlPath` | local variable | yes - follows `*Path` pattern |
| `keyrackVars` | local variable | consistent with codebase |

### structure patterns

**test utility location:** `src/.test/infra/withKeyrackContext.ts`
- follows pattern of deleted `src/.test/infra/withApikeysContext.ts`
- holds

**declapract file names:** `.test.yml.declapract.ts`, `use.apikeys.sh.declapract.ts`
- follows `{filename}.declapract.ts` pattern
- holds

**bad-practice directory:** `old-use-apikeys/`
- follows `old-*` name pattern for deprecated patterns
- holds

## verdict

all names follow codebase conventions. no divergence found.
