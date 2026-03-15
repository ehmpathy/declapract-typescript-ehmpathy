# rule.prefer.overwrite-over-mutate

## .what

when best-practice overwrites content, do not create a separate bad-practice fix for the same content.

## .why

- **overwrite is safer** — replaces entire value with known-good state
- **mutation is risky** — regex transforms can have unexpected consequences
- **duplication is wasteful** — two mechanisms for the same job
- **simpler mental model** — one path to correctness, not two
- **scope control** — only touch changes we proposed

## .when to use bad-practice fix

bad-practice fixes are appropriate when:
- best-practice uses `CONTAINS` (partial match) and cannot overwrite
- the content has user-specific portions that must be preserved
- the transformation requires domain logic (e.g., migrate imports across many files)

## .when to prefer best-practice overwrite

prefer overwrite when:
- the entire value should match a known-good template
- there's no user-specific content to preserve
- the best-practice already defines the expected value

## .example

### redundant pattern (avoid)

```
best-practice/package.json        → defines scripts.test:unit = "correct value"
bad-practices/old-test/fix        → transforms old pattern → correct value
```

if best-practice overwrites `scripts.test:unit`, the bad-practice fix is redundant.

### appropriate pattern

```
best-practice/package.json        → uses CONTAINS, checks structure
bad-practices/old-import/fix      → transforms imports in src/**/*.ts
```

the bad-practice handles files the best-practice doesn't touch.

## .yagni

if no one explicitly declares the use case a bad-practice fix is for, prune it and overwrite instead.

undocumented mutation logic is a liability — delete it.

## .summary

overwrite > mutate. limit changes to what we proposed. prevent unexpected consequences.
