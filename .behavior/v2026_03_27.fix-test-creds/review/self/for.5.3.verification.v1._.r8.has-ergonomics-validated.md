# self-review r8: has-ergonomics-validated

## the question

does the actual input/output match what felt right at design time?

---

## no repros to compare against

this behavior has no repros artifact. ergonomics were defined in:
- vision (1.vision.md) — outcome world
- blueprint (3.3.1.blueprint.product.v1.i1.md) — implementation plan

---

## compare vision to implementation

### vision said (from 1.vision.md):

> **day-in-the-life after:**
> ```bash
> npm run test:integration
> # if keyrack locked: error with exact unlock command
> # if keys absent: error with exact set commands
> ```

### implementation does:

```typescript
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'strict' });
```

**does it match?** yes.
- `mode: 'strict'` throws on absent keys
- error messages include exact commands to fix

---

### vision said:

> once-per-workshift unlock (daemon keeps session alive)

### implementation does:

- keyrack uses a daemon process for session persistence
- unlock once, tests work across terminals

**does it match?** yes. keyrack handles this internally.

---

### vision said:

> ci works without changes (env vars still work)

### implementation does:

- keyrack.source() checks process.env first
- if env var exists, uses it directly (no vault access)

**does it match?** yes.

---

## compare blueprint to implementation

### blueprint said:

> buildWorkflowSecretsBlock() invoke keyrack cli for vars

### implementation does:

```typescript
const keys = await keyrack.get({ for: { repo: true }, env: 'test' });
```

**does it match?** yes. uses keyrack sdk (not cli) but same effect.

---

### blueprint said:

> bad-practice: return { contents: null } to delete files

### implementation does:

```typescript
export const fix: FileFixFunction = () => {
  return { contents: null };
};
```

**does it match?** yes. exact implementation.

---

## ergonomics drift?

| aspect | vision | implementation | drift? |
|--------|--------|----------------|--------|
| unlock command | exact | exact | no |
| key set commands | exact | exact | no |
| daemon session | once per workshift | once per workshift | no |
| ci compatibility | env vars first | env vars first | no |
| file deletion | contents: null | contents: null | no |

---

## why it holds

1. no repros artifact, so compared vision and blueprint to implementation
2. all planned ergonomics are implemented as designed
3. no drift between plan and execution
4. user experience matches what was envisioned

