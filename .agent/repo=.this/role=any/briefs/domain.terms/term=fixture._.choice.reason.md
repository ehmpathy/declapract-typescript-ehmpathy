# domain.term.choice.reason: fixture

## .etymology

`fixture` was already the word this repo used — `.test/assets/` demo repos have carried the name
since the integration tests existed. this round did not coin it; it **bounded** it, by a name for
the property that makes a fixture dangerous to a walk.

⚠️ **and it was already in the glossary — as a word this repo forbids.**
`term=template._.choice._.md` lists `fixture` under `term.synonyms.forbidden`. that is not a
contradiction, and the resolution is stated in that cluster's own reason file:

> *"`fixture` is taken, and taken hard — `.test/assets/` fixtures are the demo repos the
> integration tests clone, a different concept in the same test files."*

so `fixture` is forbidden **as a name for a template** and canonical **as a name for a test
input**. this cluster **conforms** to that judgment rather than disputes it. no dispute is owed,
because the two clusters already agree; what was absent is the positive half — the word had a
forbid recorded against it and no definition of its own.

## .why it is paved now

the ordinary bar: it names a declared constant (`FIXTURE_DIRS`) and composes two operations
(`getAllPathsInFixtureDirs`, `getAllGithubYamlPathsInFixtures`). `grep src/**` returns matches.
no exception is claimed, and none is needed — unlike `declarer` and `pin`, which were paved
against the bar and each recorded a narrow reason.

what earned the cluster is not the identifier, though. it is that this round **settled a
two-convention fact** that had cost a measured defect, and a settled fact left in a docblock
decays into whoever last read that file.

## .disputes

### dispute: sample / dummy — raised 2026-08-06 — status: RESOLVED (keep `fixture`)
- claim      = both are plainer and need no test-framework vocabulary from the reader.
- counter    = both name the content as **arbitrary**, and the content here is the opposite of
               arbitrary. `repo-with-unpinned-workflow`'s `@v5` is chosen precisely, and the test
               that clones it asserts on that exact ref. a word that reads as "any old value"
               invites the tidy-up the class exists to prevent — the same argument that rejected
               `unsorted` for `ordered`.
- resolution = keep `fixture`; both recorded as forbidden synonyms.

### dispute: stub / mock — raised 2026-08-06 — status: RESOLVED (keep `fixture`)
- claim      = a demo repo stands in for a real consumer, which is what a stub or a mock does.
- counter    = a stub or a mock **substitutes for a dependency at run time**; a fixture is
               **real input data on disk**, and the pipeline under test runs against it for real.
               the repo forbids mocks outright in integration and acceptance tests
               (`rule.forbid.integration.mocks`, `rule.forbid.acceptance.mocks`), so to call this
               a `mock` would give a legitimate artifact the word for a forbidden one.
- resolution = keep `fixture`; both recorded as forbidden synonyms.

## .evidence

**the class was unnamed, and the omission cost 4 red — measured, not argued.**

`src/actionPins.declapract.integration.test.ts` walks every workflow yaml under `src/practices/**` and demands
a pin. its first form skipped `__snapshots__` alone, because that was the only fixture convention
in play when it was authored. the moment this round's demo repo landed at
`cicd-common/.test/assets/repo-with-unpinned-workflow/`, the walk reached it and went 🔴 **4 red**,
the first of them named:

```
src/practices/cicd-common/.test/assets/repo-with-unpinned-workflow/.github/workflows/review.yml:18
  — amannn/action-semantic-pull-request@v5
```

a correct fixture, reported as a defect, by a check whose whole job is to spot that exact string.

**the deeper property, and why a name is the fix rather than a longer skip list:**

> to every check below the walk, a fixture and a defect are **indistinguishable**. both are a
> workflow yaml with a tag ref. only the walk knows which directory it came from, so only the walk
> can tell them apart — and it can only do so if the class has a name it enumerates.

that is why `FIXTURE_DIRS` is a declared constant rather than an inline skip: an author who adds a
third convention meets the list at the point of the edit, which is the same move
`term=sortable._.choice.reason.md` made for the sortable/ordered split.

**the anti-vacuity pair, and what it demands of the word.** the exclusion is clamped from both
sides: the walk skips fixtures, and a second assertion re-walks the *same* tree with `skip: []` and
demands that the excluded set holds **at least one unpinned ref**. so the word carries a checkable
claim — *a fixture is free to hold what a template must not* — and if that ever ceases to hold of
every fixture, the pair goes red rather than quietly guards an empty set. **proven to bite:** pin
the demo fixture → 🔴 1 red, that assertion alone.

⚠️ the claim is *"at least one unpinned"*, deliberately, not *"none pinned"*. a future fixture may
hold a pinned ref as a legitimate after-state. the word does not forbid a pin in a fixture; it
records that a pin is not **required** there.

## .the four classes, and why this one completes them

| class | copied to a consumer? | executed here? | may hold an unpinned ref? |
|---|---|---|---|
| `template` | ✅ yes | no | ❌ never |
| `declaration` | no | ✅ yes | n/a |
| `meta` | no | no | n/a |
| **`fixture`** | no | no — it is **read** | ✅ **yes, on purpose** |

`meta` and `fixture` share the middle two columns and differ on the last, which is why the
`template`/`declaration` pair could not absorb either. `meta` remains unpaved — declapract owns
that word (`metaFilePaths`), and a cluster would duplicate the tool's vocabulary. `fixture` is
this repo's own word, so it is ours to define.

## .see also

- `term=template._.choice._.md` — where `fixture` is forbidden as a synonym; this cluster conforms
- `term=template._.choice.reason.md` — the 2026-07-30 dispute that named `meta` as a third class
- `term=sortable._.choice.reason.md` — the same "name the class so the choice is explicit" move
- `rule.forbid.integration.mocks`, `rule.forbid.acceptance.mocks` — why `mock` is forbidden here
- `src/actionPins.declapract.integration.test.ts` → `FIXTURE_DIRS` — the one declaration of this class
