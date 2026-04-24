# review.self: has-pruned-yagni (r1)

## review for YAGNI

checked each component against vision requirements:

---

### 1. firewall step in test-shards-integration and test-shards-acceptance

**requested?** yes — vision explicitly states "add firewall step to each job that needs secrets"

**minimum viable?** yes — only added to jobs that run tests with secrets (integration, acceptance)

**holds**: this is the core feature

---

### 2. prepare:rhachet step before firewall

**requested?** not explicitly, but required for firewall to work

**why needed**: keyrack.yml can extend other manifests via symlinks. prepare:rhachet creates these symlinks so keyrack.source() can hydrate extended keys.

**is this YAGNI?** no — without this, firewall would fail on projects that use keyrack extension patterns

**holds**: necessary infrastructure for firewall

---

### 3. `secrets: inherit` in caller workflows

**requested?** yes — vision states "use `secrets: inherit` in callers"

**minimum viable?** yes — single line addition per workflow

**holds**: required for firewall to receive secrets

---

### 4. FileCheckType.EQUALS simplification

**requested?** yes — vision states "simplify workflow declapract files — remove slug parse logic"

**minimum viable?** yes — replaced 100+ lines with 14 lines. no build-time injection needed since firewall handles at runtime

**holds**: correct simplification

---

### 5. deletion of buildWorkflowSecretsBlock.ts

**requested?** yes — vision states "refactor...or delete if no longer needed"

**minimum viable?** yes — no consumers remain after simplification

**holds**: correct cleanup

---

### 6. deletion of withKeyrackContext.ts

**requested?** not explicitly, but consequence of test file removal

**why deleted**: only consumer was the deleted test files

**is this YAGNI?** no — this is removal of unused code, not addition

**holds**: correct cleanup

---

### 7. deletion of test files and snapshots

**requested?** yes (implicitly) — vision states "update tests"

**why deleted**: these tests verified buildWorkflowSecretsBlock behavior which no longer exists

**holds**: tests for deleted code should be deleted

---

### 8. deploy.yml in cicd-app-react-native-expo

**requested?** yes — vision states "all workflow types that use keyrack secrets"

**minimum viable?** yes — same pattern as other deploy.yml

**holds**: consistent application of pattern

---

## summary

no YAGNI found. all components either:
- explicitly requested in vision
- required for requested features to work
- cleanup of code that became unused

no abstractions added "for future flexibility". no features added "while we're here". no optimizations before needed.
