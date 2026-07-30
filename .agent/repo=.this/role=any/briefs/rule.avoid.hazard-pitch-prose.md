# rule.avoid.hazard-pitch-prose

## .what

write an ordinary mechanism at ordinary pitch. state what happens, plainly, and stop.

a caution is for a hazard. "a practice inserts lines into a file" is not a hazard — it is the
feature.

## .why

when every mechanism is written at hazard pitch, a reader cannot tell a real hazard from a routine
one. the alarm no longer carries signal.

worse, prose pitched as alarm over a mundane mechanism reads as **suspicious**. it makes a reader
suspect a problem is present where none is, and then hunt for it. that is the opposite of what a
doc is for.

## .the test

before a caution goes in, ask: **is this dangerous, or is it just how the tool works?**

- dangerous → caution, stated once, with the failure mode named
- how it works → one plain sentence, no bold, no ⚠️

## .the tells

prose at hazard pitch has a recognizable shape. if a draft holds these, re-read it as a stranger:

- `the remedy is…` for a routine next step
- `that red is correct. do not weaken it.`
- `⚠️ the cause is…` over a normal precondition
- `two facts carry the load here`
- a bolded ALL-CAPS coinage for a state that needed no name
- a table that grades the author's own work

## .also: a doc is not a transcript

self-critique of a test's assertion strength, `solve-at-cause` arguments, and design debates are
real work — but they belong in a follow-on record or an issue, never in a practice readme. a
reader who was never in the room cannot use them (`rule.require.timeless-comments`).

likewise, do not name a specific neighbor practice when the general contract is the point. the
reader usually does not need to know, and the reference goes stale the first time the set changes.

## .examples

### 👎 bad — ~40 lines, three subsections, a self-grade table

a `.declapract.readme.md` section on "add a line to the template, run the tool, the line arrives"
that grew to cover: whether the state counts as drift, what the evidence says about harm, why the
remedy is not a hand-edit, which of the test's three assertions carry weight, and a table that
grades each one.

### 👍 good — the same content, 4 lines

```md
## this repo consumes this practice

`declapract.use.yml` sets `useCase: npm-package`, which extends `typescript-project`, which
carries `git`. so `[case3]` in `src/practices/git/.declapract.integration.test.ts` checks this
repo's own `.gitignore` against the declaration — add a line to `ignoresSortable` and it goes red
until the practice is applied here too
```

## .enforcement

- a caution over a routine mechanism = **nitpick**
- a durable doc that transcribes a design debate = **nitpick**
- a doc section with a table that grades its own author's work = **nitpick**

## .see also

- `rule.require.timeless-comments` (mechanic) — write for a reader who was never in the room
- `rule.forbid.buzzwords` (mechanic) — the adjacent rule on prose that inflates
