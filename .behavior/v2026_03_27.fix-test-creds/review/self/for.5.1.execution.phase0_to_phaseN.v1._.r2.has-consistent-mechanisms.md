# self-review r2: has-consistent-mechanisms

## examination

searched for patterns: `buildWorkflowSecretsBlock|buildExpectedContent|getKeyrackKeys`

found 2 related mechanisms:

### mechanism 1: buildWorkflowSecretsBlock (utils/)
- used by: test.yml, publish.yml, deploy.yml declapract files
- purpose: inject secrets passthrough block to caller workflows
- output format: `secrets:\n      KEY: ${{ secrets.KEY }}`

### mechanism 2: getKeyrackKeys + buildExpectedContent (.test.yml.declapract.ts)
- used by: .test.yml declapract file only
- purpose: inject secrets declaration AND env vars to reusable workflow
- output format: secrets declaration with descriptions + env block

## duplication analysis

**duplicated logic (lines 11-28 of .test.yml.declapract.ts vs lines 15-34 of buildWorkflowSecretsBlock.ts):**
```typescript
// both files have:
const keyrackYmlPath = join(..., '.agent/keyrack.yml');
if (!existsSync(keyrackYmlPath)) return ...;
const keys = await keyrack.get({ for: { repo: true }, env: 'test' }) as KeyrackGrantAttempt[];
const keyNames = keys.map(k => (k.status === 'granted' ? k.grant.slug : k.slug).split('.').pop()!);
```

**why they differ (holds):**

| aspect | buildWorkflowSecretsBlock | buildExpectedContent |
|--------|---------------------------|----------------------|
| target | caller workflows (test.yml, publish.yml, deploy.yml) | reusable workflow (.test.yml) |
| output | `secrets: KEY: ${{ secrets.KEY }}` | secrets declaration + env block |
| format | single block after `uses:` | two blocks: workflow_call + job env |

the output transformation is fundamentally different because:
- caller workflows just pass secrets through
- reusable workflow declares secrets (with descriptions) AND injects them to env vars

**could we extract key retrieval?**

yes, a shared `getKeyrackKeys(projectRootDir)` utility could be extracted.

however:
1. both files already have the pattern
2. extraction would add a new utility file
3. the duplication is ~15 lines in 2 files
4. blueprint did not request consolidation

## verdict

**non-issue (holds):** duplication is minimal (~15 lines), serves different output transformations, and was not flagged for consolidation in blueprint. the extraction of getKeyrackKeys would be a future refactor, not a consistency violation.

**no other new mechanisms found** that duplicate functionality.
