# declapract check semantics

## .what

the `check` function in `.declapract.ts` files has different semantics based on whether it's in a best-practice or bad-practice directory.

## .rules

### best-practice check

```ts
// src/practices/{practice}/best-practice/{file}.declapract.ts

export const check: FileCheckFunction = (contents, context) => {
  // throw if the best practice is VIOLATED (file doesn't match expected)
  if (contents !== expected) {
    throw new Error('best practice violated: ...');
  }

  // return = best practice is followed (file matches expected)
};
```

- **throw** = best practice is violated → declapract will flag this file
- **return** = best practice is followed → declapract will pass this file

### bad-practice check

```ts
// src/practices/{practice}/bad-practices/{bad-practice-name}/{file}.declapract.ts

export const check: FileCheckFunction = (contents, context) => {
  // return if the bad practice IS DETECTED (file matches bad pattern)
  if (contents?.includes('bad-pattern')) {
    return; // bad practice detected
  }

  // throw = bad practice NOT detected (file doesn't match bad pattern)
  throw new Error('does not match bad practice');
};
```

- **return** = bad practice is detected → declapract will flag this file and offer fix
- **throw** = bad practice is not detected → declapract will skip this file

## .summary

| directory | throw means | return means |
|-----------|-------------|--------------|
| `best-practice/` | practice violated (flag it) | practice followed (pass) |
| `bad-practices/` | pattern not found (skip) | pattern found (flag it) |

## .the CLI verbs are NOT `check` and `fix`

⚠️ `check` and `fix` name the two exported members of a **declaration**. they are not commands.
`declapract check` and `declapract fix` do not exist, and a doc that prints them hands a reader a
command that exits `error: unknown command`.

the CLI registers exactly four (`contract/cli/invoke.js`):

| command | what it does | the member it drives |
|---------|--------------|----------------------|
| `plan` | previews what must change for a project to adhere | runs every `check` |
| `apply` | applies fixes to files that failed to adhere | runs `fix` where a `check` failed |
| `validate` | validates the declarations themselves | — |
| `compile` | compiles declarations for npm distribution | — |

so: **the concept is `check`/`fix`; the command is `plan`/`apply`.** prose in this repo (and in this
brief) uses the concept names freely, and that is correct — but a doc that tells a human what to
type must use the command names.

⚠️ **this bit once.** a durable artifact reached a peer review with `npx declapract fix` in its
copy-paste block, aimed at a reader whose CI was broken. the vocabulary was inherited from briefs
like this one, which had never drawn the line — so the error was invisible to anyone who trusted the
in-repo prose as an interface reference. it is drawn here now.

`apply`'s `--practice` and `--file` flags scope **which declarations run** — never which *part* of a
declared file lands. a declared file is applied whole (see `declapract-default-check-equals.md`).

## .todo

update declapract to simplify this api — instead of throw/return semantics, have the check function return a declaration:

```ts
export const check: FileCheckFunction = (contents, context) => {
  if (matchesBadPattern(contents)) {
    return 'FAIL'; // flag this file
  }
  return 'PASS'; // pass this file
};
```

this would eliminate the inverted semantics between best-practice and bad-practice checks.
