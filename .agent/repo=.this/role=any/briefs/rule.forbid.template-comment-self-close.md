# rule.forbid.template-comment-self-close

## .what

a comment inside an emitted **template** (a `best-practice/` file copied into a consumer repo) must
never spell its own terminator in its prose. in a language with block comments — `.ts`, `.tsx`,
`.tf`, `.css` — that terminator is `*/`, and the commonest way to write it by accident is a glob or
an iam arn: a `*` wildcard immediately before a `/` separator.

```
parameter/*/svc-*/database/role/cicd/for-plan/*
          ^^                                      the comment ends here
```

write the wildcard as `<star>` instead. any stand-in works, so long as no `*` sits immediately
before a `/`.

## .why

- **a template is source, in every adopter at once.** it is copied verbatim into a consumer repo,
  where their biome parses it on every `pnpm fix`. a template that does not parse breaks `pnpm fix`
  in every repo that adopts the practice, simultaneously.
- **the adopter cannot repair it.** the file is an enforced best-practice artifact, so a hand-edit
  is reverted by the next `declapract apply`. their only lever is a pin back to a prior version,
  which defeats the upgrade. the repair must ship from here.
- **this repo's own lint cannot catch it.** `biome.jsonc` excludes the practice provision tree,
  because templates carry `@declapract{}` syntax that is valid only post-compile. so the templates
  are the one tree with no parse gate from biome — the clamp below is that gate.
- **the symptoms mislead.** once the parse aborts, the downstream diagnostics describe a different
  defect: an export reads as unused, and the offered "fix" renames it and breaks its importers. a
  reader who chases those spends the debug on the wrong file.

this is the SYNTACTIC twin of `rule.forbid.source-refs-in-template-comments`. that rule asks whether
a template comment *reads* correctly in the consumer's tree; this one asks whether the file still
*parses* once the comment is in it.

## .the test

for a comment about to land in a `best-practice/` template, in a language with block comments:

> does the prose hold a `*` immediately before a `/`?

- yes → the comment ends there. substitute `<star>` for the wildcard.
- no → safe.

a glob (`src/*/index.ts`), an iam arn (`parameter/*/svc-*/…`), and a path pattern are the three
shapes that carry it.

## .how

- **substitute a visible stand-in** — `<star>`, and say in the comment that it stands in for a
  literal `*`. the next author then knows the substitution is deliberate and does not "restore"
  the real arn.
- **do NOT reach for a zero-width space.** several of this repo's own clamp jsdocs escape the
  sequence that way. that is tolerable in a file that stays here; in a SHIPPED template it is a
  trap — the character is invisible in review, and a consumer's formatter or editor may strip it
  and silently re-break the file.
- **keep the prose.** the note usually explains a real constraint (here: why the arn needs literal
  `/` separators). the substitution changes how one character is written, never the reason.

## .the clamp

`src/bestPracticeTemplateParse.declapract.integration.test.ts` holds the class: every `.ts`/`.tsx`
template under any `best-practice/` must parse as valid typescript, and no multi-line jsdoc in one
may close itself mid-line. two nets over one defect — the parse case reads the property an adopter
suffers; the jsdoc-shape case catches the silent variant where the prose tail happens to parse as
valid code, so the file is green and the note is corrupted.

⚠️ the clamp covers `.ts`/`.tsx` today. `.tf` and `.css` templates carry the same block-comment
terminator and have no parse gate — the rule binds there, the clamp does not yet reach.

## .examples

### 👎 bad — the arn ends the comment mid-prose

```ts
/**
 * .note = pinned in the plan role's iam policy as a SLASH path —
 *         `parameter/*/svc-*/database/role/cicd/for-plan/*`. that pin needs literal
 *         `/` separators, so a dotted name cannot match it.
 */
export const getAllParameters = () => { /* ... */ };
```

the comment ends at `parameter/*`. every character after it is read as code: 17 parse errors, and
`getAllParameters` reads as unused.

### 👍 good — a visible stand-in, and a note that it is one

```ts
/**
 * .note = pinned in the plan role's iam policy as a SLASH path —
 *         `parameter/<star>/svc-<star>/database/role/cicd/for-plan/<star>`. that pin needs
 *         literal `/` separators, so a dotted name cannot match it.
 * .note = `<star>` stands in for the literal `*` wildcard, and must stay a stand-in. a literal
 *         `*` immediately before a `/` closes this comment mid-prose.
 */
export const getAllParameters = () => { /* ... */ };
```

## .enforcement

- a template comment whose prose spells the block-comment terminator = **blocker** (the emitted
  file does not parse, in every adopter, with no repair available to them)
- a zero-width space, or another invisible character, used to escape the sequence in a SHIPPED
  template = **blocker** (invisible in review, strippable by a consumer's formatter)
- a stand-in with no note that it is a stand-in = **nitpick** (the next author restores the literal)

## .see also

- `rule.forbid.source-refs-in-template-comments` — the semantic twin: a template comment must also
  READ correctly in the consumer's tree
- `howto.add-best-practice` — where a template is authored
- `domain.terms/term=template._.choice._.md` — why a template's comments land in a consumer's tree
- `rule.require.timeless-comments` (mechanic) — write for a reader who was never in the room
