# define.declapract-test-files

## .what

declapract sorts every file under a practice into one of three kinds by its name. a **test file** —
one whose name ends `.declapract.test.ts` (or its `.snap`) — is treated specially at two moments:

1. **the loader** (`plan` / `apply`) reads a practice's `best-practice/` dir and turns every file
   into a template check — EXCEPT a `.declapract.*` file, which is a declaration or a meta file,
   never a template (`declapract-default-check-equals`).
2. **compile** (the publish step) filters files a second time, and drops `.declapract.test.ts`
   (+ `.snap`) before it copies a practice into the distributed package.

so a `.declapract.test.ts` file inside `best-practice/` is neither published nor applied to a
consumer — even though every other best-practice file IS a template the loader enforces. that is
the mechanism `rule.require.collocate-clamp-tests` rests on: it is what lets a clamp test sit beside
the file it clamps and never reach a consumer as an EQUALS template.

## .why it matters

a **clamp test** proves a single shipped template file behaves as claimed (it imports/transpiles
that one file). the most legible home for such a test is beside its subject, inside `best-practice/`
— a maintainer who opens the template finds its clamp in the same dir, named after it. that home is
only safe because declapract strips the test before publish; without the strip, the clamp would ride
along into every consumer and be enforced as a byte-for-byte template.

## .the two filters, read from source

### the loader — every non-declaration best-practice file is a template

`readPracticeDeclaration` finds `best-practice/`; `getProjectCheckDeclaration` walks it via
`listFilesInDirectory` (globby, honors gitignore + a fixed ignore set of `node_modules/.git/dist/
build/coverage` — NO `.test.ts` exclusion). every file that does NOT match `\.declapract\.` becomes
a template check, EQUALS by default. a `^\.declapract\.` file at the PROJECT root is a meta file; a
`<name>.declapract.ts` beside a template is that template's declaration.

⇒ so the loader alone would enforce a collocated clamp test as a template. the strip is what saves it.

### compile — the ship-gate that strips test files

`compile.js` is the sole ship-gate. its filter (verified at `compile.js:24-25`):

```js
const relevantFilePaths = filePaths.filter(
  (filePath) =>
    !filePath.endsWith('.declapract.test.ts') &&
    !filePath.endsWith('.declapract.test.ts.snap'),
);
```

a file that ends `.declapract.test.ts` (or its `.snap`) is dropped before the practice is copied
into the published package. every other best-practice file ships.

## ⚠️ .the integration-variant gap

the compile filter tests `.endsWith('.declapract.test.ts')`. that is `false` for a name that ends
`.declapract.integration.test.ts`:

```js
'x.declapract.integration.test.ts'.endsWith('.declapract.test.ts'); // false
```

so an **integration** clamp test collocated in `best-practice/` is NOT stripped — it ships, and a
consumer's `apply` enforces it as an EQUALS template. today only a **unit** clamp test
(`.declapract.test.ts`) is safe to collocate.

- the fix-at-cause is a one-line filter extension in `ehmpathy/declapract` (also drop
  `.declapract.integration.test.ts` + its `.snap`) — dispatched as `ehmpathy/declapract#109`.
- until that lands, a `.declapract.integration.test.ts` clamp test must NOT live in `best-practice/`.

## .the three file kinds, by name

| name ends | kind | loader | compile |
|-----------|------|--------|---------|
| `.declapract.test.ts` (+ `.snap`) | **unit clamp test** | ignored (matches `\.declapract\.`) | **stripped** — never ships |
| `.declapract.integration.test.ts` (+ `.snap`) | **integration clamp test** | ignored | ⚠️ NOT stripped today (declapract#109) |
| `<name>.declapract.ts` | declaration for `<name>` | read as its check/fix | ships (drives the check) |
| `^.declapract.*` at project root | meta file (declare/use/config) | read as meta | n/a |
| every other file in `best-practice/` | **template** | EQUALS template check | ships |

## .see also

- `rule.require.collocate-clamp-tests` — the rule this mechanism backs: where a clamp test lives and
  what it is named
- `declapract-default-check-equals` — why a bare best-practice file defaults to an EQUALS template
- `declapract-check-semantics` — the throw/return polarity of a `.declapract.ts` check
- `rule.forbid.test-assets-in-src` — why the collocated helper + its clamp live at `src/.test/`
- `rule.require.declapract-integration-tests` — the `executeApply` pipeline test that stays at the
  practice root (NOT a clamp test — it clamps no single file)
