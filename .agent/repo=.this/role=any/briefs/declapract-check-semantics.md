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
