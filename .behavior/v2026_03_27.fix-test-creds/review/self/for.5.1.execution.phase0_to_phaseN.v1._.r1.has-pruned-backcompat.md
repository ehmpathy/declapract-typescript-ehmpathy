# self-review: has-pruned-backcompat

## question

did we add backwards compatibility that was not explicitly requested?

## findings

### non-issues (holds)

**old-use-apikeys bad-practice**
- creates migration path for repos with old use.apikeys.sh/json files
- explicitly requested in blueprint: "create bad-practice to migrate repos with old pattern"
- holds: explicitly requested

**existsSync check before keyrack.source()**
- allows repos without keyrack.yml to run tests normally
- explicitly specified in blueprint section 1
- explicitly specified in blackbox criteria:
  > given('no keyrack.yml exists in repo')
  >   when('developer runs npm run test:integration')
  >     then('tests execute without credential check')
- holds: explicitly requested

**existsSync check in buildWorkflowSecretsBlock**
- returns template unchanged if no keyrack.yml present
- explicitly specified in blueprint section 3
- holds: explicitly requested

### issues found

none.

## verdict

no unasked backwards compatibility found. all backwards compat measures were explicitly specified in:
- blueprint section 1 (jest env files)
- blueprint section 3 (buildWorkflowSecretsBlock)
- blackbox criteria usecase.1 (no keyrack.yml case)
- blueprint file tree (bad-practice for migration)
