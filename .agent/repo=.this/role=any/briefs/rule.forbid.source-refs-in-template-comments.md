# rule.forbid.source-refs-in-template-comments

## .what

a comment inside an emitted **template** (a `best-practice/` file copied into a consumer repo) must
read correctly in the CONSUMER's tree — the only place it is ever read. two prohibitions follow:

1. no reference to a path, practice, or file that exists only in THIS (the declapract source) repo. a
   consumer greps for `cicd-common/.install.yml` and finds nothing — the comment points at a file
   absent from the world where it is read.
2. no fabricated rationale. if the durable reason for a line is unknown, omit it. an invented "why"
   is worse than silence — it misleads the consumer with confidence.

## .why

- a `template` is resolved in the consumer's tree, not here (see the `template` vs `declaration`
  glossary pair). so its comments have the consumer as their audience, and a declapract-internal
  cross-reference is a dangling pointer there — the reader cannot reach it, and it goes stale the
  first time the source set changes.
- "matches the canonical X" is a reason from the decision process (what the line was copied from),
  not the durable why (what actually depends on it). `rule.require.timeless-comments` (mechanic)
  wants the statement of what IS, written for a reader who was never in the room — and the consumer
  never was.
- a made-up reason is a defect that reads as fact. the consumer trusts it, acts on it, and the wrong
  mental model propagates. an absent comment leaves the reader to check the code; a false one sends
  them the wrong way.

## .the test

for a comment about to land in a `best-practice/` template, ask both:

1. "could a consumer, in their own repo, act on every reference in this comment?" — a path/practice
   name only present in the declapract source fails.
2. "do i actually know the durable why, or am i restating what it was cloned from?" — if the why is
   unknown, delete the comment rather than invent one.

## .examples

### 👎 bad — references a declapract-source path, gives a copied-from rationale

```yaml
# matches the canonical cicd-common/.install.yml (no --ignore-scripts): the
# org-standard install runs lifecycle scripts, so this deploy install does too
- run: npm ci
```

the consumer has no `cicd-common/.install.yml`; the "why" is conformance to a file they cannot see.

### 👍 good — durable why, legible in the consumer's tree

```yaml
# install WITHOUT --ignore-scripts: the native module build runs in a
# lifecycle script, so an --ignore-scripts install ships a repo that cannot boot
- run: npm ci
```

### 👍 also good — the durable why is unknown, so omit it

```yaml
- run: npm ci
```

better a bare line than a fabricated reason. record the open question in a `.declapract.readme.md`
beside the DECLARATION (declaration-side, never emitted) if it needs a home.

## .enforcement

- a template comment that references a path/practice/file present only in the declapract source repo
  = **blocker** (a dangling reference in the consumer's tree)
- a template comment whose rationale is invented rather than known = **blocker** (a false fact the
  consumer will trust)
- a template comment that states "matches / copied from / same as <source-repo thing>" as its whole
  reason = **nitpick** (restate the durable why, or delete)

## .see also

- `rule.require.timeless-comments` (mechanic) — write for a reader who was never in the room
- `rule.avoid.hazard-pitch-prose` — the adjacent rule against naming a specific neighbor practice
  when the general contract is the point
- `domain.terms/term=template._.choice._.md`, `term=declaration._.choice._.md` — why a template's
  comments are read in the consumer's tree and a declaration's are read here
