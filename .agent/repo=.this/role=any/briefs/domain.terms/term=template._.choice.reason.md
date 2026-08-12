# domain.term.choice.reason: template

## .etymology

`template` is the word the repo's own guide already uses for a `best-practice/` file that a consumer
receives verbatim (`howto.add-best-practice.md`). this round did not invent it — it **bounded** it,
by a name for what it is NOT.

the word was overloaded before. "the files in `best-practice/` are templates" reads as a statement
about a **directory**, and it is false: that directory holds two kinds of file, and only one kind is
a template. the fix is not a new word for templates; it is a name for the other kind
(`declaration`), so that `template` means one concept again.

**this is the `sortable`/`ordered` move repeated.** there, the default class was named so that an
author's choice of constant *is* the classification. here, the copied class is bounded so that an
author who reaches for "it's a template, so…" must first check which kind of file they hold.

## .disputes

### dispute: leave `template` unbounded — raised 2026-07-29 — status: RESOLVED (bound it)
- claim      = `template` is already understood; the real new term is `declaration`. pave one, not
               two. `rule.prefer.wet-over-dry` and minimalism both argue against a second cluster.
- counter    = the defect was a **conflation**, which is a property of the pair, not of either word
               alone. the failed sentence — *"best-practice files are templates, not a module
               tree"* — misuses `template` by **over-extension**, so a cluster on `declaration`
               alone leaves the word that was actually misused unbounded. same argument the
               `sortable` cluster settled: an unnamed half of a pair is an invisible decision.
- resolution = pave both. neither reads correctly alone.

### dispute: fixture / boilerplate / scaffold — raised 2026-07-29 — status: RESOLVED
- counter    = `fixture` is taken, and taken hard — `.test/assets/` fixtures are the demo repos the
               integration tests clone, a different concept in the same test files. `boilerplate`
               and `scaffold` both imply a **start point a consumer then edits**, which inverts the
               contract: a template is the state a consumer is held TO, checked by `EQUALS` and
               rewritten by `fix` when it drifts.
- resolution = keep `template`; all three recorded as forbidden synonyms.

### dispute: the pair is NOT exhaustive — `meta` is a third class — raised 2026-07-30 — status: OPEN
- raised.by  = mechanic 🐢
- claim      = this cluster's example block reads as a full census of `best-practice/`, and its
               "useful test" below resolves every file to one of the two. a `.declapract.readme.md`
               is neither: it is not copied to a consumer, and it does not execute. it is a **meta**
               file, and declapract itself names it so.
- evidence   = `node_modules/declapract/dist/…/getProjectCheckDeclaration.js:28` filters
               `paths.filter((path) => new RegExp(/^\.declapract\./).test(path))` into
               `metaFilePaths`. the discriminator is a **name prefix**, not a semantic.
- measured   = a file named `.gitignore.declapract.readme.md` does not match that prefix, so
               declapract treated it as a **declared file** a consumer must have → 🔴 **38
               integration failures**, `no hydrated input but also no contents`. renamed back to
               `.declapract.readme.md` → green. the class boundary is enforced by the loader, and
               it bites.
- why OPEN   = `meta` is declapract's own word, not this domain's — so
               `rule.require.domain-term-itemization` does not ask for a cluster, and one would
               duplicate the tool's vocabulary. what is settled and recorded here is the
               **correction**: the pair is not total, and the test below is fixed to say so. whether
               `meta` earns its own cluster is deferred.

## .evidence

**the boundary carries load, and it is invisible in a directory tree:**

```
src/practices/git/best-practice/
├── .gitignore                    ← template     — copied to the consumer
├── .gitignore.declapract.ts      ← declaration  — executed HERE
├── .gitattributes                ← template
├── .gitattributes.declapract.ts  ← declaration
└── .declapract.readme.md         ← meta         — neither copied nor executed
```

adjacent lines, opposite semantics. a claim about "the files in this directory" is true of at most
half of them.

**what the over-extension cost:** the sentence *"best-practice files are templates, not a module
tree"* was recorded as fact and cited five times to defer a refactor. it is false of exactly the
files it was applied to — and `src/practices/tests-node/best-practice/jest.unit.env.ts.declapract.ts:6`
imports `../../../utils/readFile` from inside `best-practice/`, which is the disproof that sat in
the same directory the claim describes.

**the useful test**, for an author unsure which kind they hold — read it in this order, because the
first question is the one declapract itself asks:

1. does the filename start with `.declapract.`? → **meta**. declapract routes it to `metaFilePaths`
   and never checks it against a consumer. `.declapract.readme.md`, `.declapract.todo.md`.
2. else, does it end in `.declapract.ts`? → **declaration**. executed here, may import from
   `src/utils/` as freely as any module in this repo.
3. else → **template**. copied to the consumer, so its imports are looked up in the consumer's tree.

⚠️ an earlier form of this test asked only *"does a consumer end up with this file's contents?"* —
which resolves a meta file to "declaration", and that is wrong. the boundary is the **name prefix**,
not the consumer-receipt semantic. see the 2026-07-30 dispute above for the run that measured it.

## .see also

- `term=declaration._.choice._.md` — the paired opposite, and the fuller account of the defect
- `term=sortable._.choice.reason.md` — the same "name the default so the choice is explicit" move
- `declapract-default-check-equals.md` — a template with no paired declaration is checked `EQUALS`
- `howto.add-best-practice.md` — how a template is authored
