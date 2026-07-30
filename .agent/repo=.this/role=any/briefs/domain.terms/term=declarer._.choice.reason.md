# domain.term.choice.reason: declarer

## .etymology

`declarer` is the agent noun of declapract's own verb: a practice **declares** what a file should
hold, so the practice that does so is its declarer. the word was already in the repo's prose before
this cluster existed — it appears in four of the five extant clusters.

## .why it is paved despite no identifier

**this term breaks the usual bar, deliberately, and the exception should be legible rather than
quiet.** `rule.require.domain-term-itemization` asks for terms that compose a **declared** domain
object or operation. `declarer` composes none — a `grep` over `src/**` returns zero matches. there
is no `Declarer` class and no `getDeclarer`.

it was deferred on exactly that ground, twice (2026-07-29 rounds 2 and 3), each time recorded as
*"still prose, not an identifier."*

**what changed is not the code — it is that the word became load-carrying in the glossary itself:**

1. **it defines another canonical term.** `term=convergence._.choice.reason.md` separates
   `convergence` from `idempotency` as *"agreement between **declarers**, distinct from agreement of
   a **declarer** with itself."* that sentence is the entire reason both terms exist rather than
   one, and it rests on a word the glossary had not defined. a canonical term defined in terms of an
   unpaved one is a definition with a hole in it.
2. **it appears in a say-level `.refs` block** — `term=convergence._.choice._.md` labels its two
   references `declarer 1` and `declarer 2`. that is glossary-canonical surface, not incidental
   prose.
3. **it became the subject of a stated contract.** on 2026-07-29 the human observed that
   `src/practices/git/best-practice/.declapract.readme.md` named `rhachet` outright to explain who
   else declares the repo-root `.gitignore`, and asked why a reader should need that. the fix was to
   generalize from the **instance** to the **class**: *"every declarer must emit the same shape."*
   that is the moment the word stopped as a convenient label and became what the contract
   quantifies over.

so the bar it clears is not "it names an identifier" but **"the glossary cannot state its own terms
without it."** that is a narrower exception and worth a note as one, so it is not read as license to
pave every noun in the prose.

## .disputes

### dispute: owner — raised 2026-07-29 — status: RESOLVED (keep `declarer`)
- claim      = the repo's own docs already say a practice "owns" the ignore for the dirs it creates,
               so `owner` is the extant word.
- counter    = **`owner` and `declarer` are different concepts, and the repo needs both.** rhachet
               *owns* `.agent/.cache/` in the sense that rhachet creates the dir — a claim about
               cause. `git` is also a *declarer* of that same line, without any such claim.
               the rhachet readme states exactly this: *"'rhachet owns it' does NOT mean 'git should
               drop it'."* collapse the two words and that sentence becomes unsayable.
- resolution = keep `declarer` for the structural relation (this practice declares this file);
               leave `owner` free for the causal one. recorded as a forbidden **synonym**, not a
               deprecated word — it stays valid in its own sense.

### dispute: author / source / contributor — raised 2026-07-29 — status: RESOLVED
- counter    = *author* implies the practice wrote the file's content, when it emits a union of its
               own lines with the consumer's. *source* is overloaded past use (source tree, source
               of truth, single-source). *contributor* implies an additive relation, which
               understates it — a declarer's `check` can **reject** a file it did not write.
- resolution = keep `declarer`; all three recorded as forbidden synonyms.

## .evidence

the plurality the word names is the whole point, and it is measurable: the repo-root `.gitignore`
has **three** declarers — `git`, `rhachet`, and `cicd-app-react-native-expo`. the third sat
outside the convergence guarantee for ~22 months (**#537**); as of 2026-07-30 all three route
through one shared algorithm, and the cross-declarer clamps hold each pair.

that the count reached three *before* the third one converged is itself the evidence for the term.
"the practice" could not say which of them was out of guarantee, because it presumed one.

before the rhachet fold-in, every `.declapract.ts` file had exactly one declarer, and the word was
unnecessary — "the practice" sufficed. it became necessary the moment a file could have several,
which is the same event that made `convergence` necessary. **the two terms were born of one change**,
and that is why one cannot be defined without the other.

## .see also

- `term=declaration._.choice._.md` — the module; this is the practice that holds one
- `term=convergence._.choice._.md` — the property, defined between declarers
- `rule.require.domain-term-itemization` — the bar this term clears by exception, stated above
