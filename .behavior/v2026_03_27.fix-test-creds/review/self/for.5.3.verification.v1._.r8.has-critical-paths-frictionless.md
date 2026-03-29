# self-review r8: has-critical-paths-frictionless

## the question

are the critical paths frictionless in practice?

---

## trace the user experience

I read `jest.integration.env.ts` (98 lines) to understand exactly what happens when a developer runs tests.

### what happens step by step

1. **jest loads the env file** (line 1-7)
   - imports keyrack from rhachet/keyrack
   - this is a synchronous import — no async setup needed

2. **safety checks run first** (lines 18-86)
   - checks package.json exists
   - checks NODE_ENV === 'test'
   - checks aws credentials if needed
   - checks testdb if needed

3. **keyrack.source() runs last** (lines 89-97)
   ```typescript
   const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
   if (existsSync(keyrackYmlPath))
     keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
   ```

### friction analysis

| step | friction? | why |
|------|-----------|-----|
| keyrack import | none | synchronous, no setup |
| existsSync check | none | fast fs check |
| keyrack.source() call | **potential** | depends on keyrack state |

### keyrack.source() friction scenarios

**scenario 1: keyrack locked**
- error: "keyrack not unlocked"
- fix: `rhx keyrack unlock --env test --owner ehmpath`
- friction: one command, then tests work

**scenario 2: keys absent**
- error lists each absent key with `rhx keyrack set --key X --env test`
- friction: one command per key, then tests work

**scenario 3: keyrack unlocked and keys present**
- no error
- friction: none

**scenario 4: ci (env vars set)**
- keyrack.source() checks process.env first
- friction: none

---

## does it feel effortless?

**first time setup:** developer sees exact commands to fix issues. one unlock + key sets.

**daily usage:** keyrack stays unlocked via daemon. tests "just work".

**ci:** env vars take precedence. no keyrack unlock needed.

---

## compare to old pattern

| old pattern | new pattern |
|-------------|-------------|
| source .agent/.../use.apikeys.sh | tests just work |
| every terminal | once per workshift |
| vague error messages | exact fix commands |

---

## why it holds

1. traced user experience line by line in jest.integration.env.ts
2. identified 4 scenarios for keyrack.source()
3. worst case friction: one unlock + key sets (first time only)
4. daily friction: none (daemon keeps session alive)
5. ci friction: none (env vars first)
6. significant improvement over old pattern

