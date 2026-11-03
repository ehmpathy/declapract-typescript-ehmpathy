# F11: the shared gitattributes util keeps its shape: a plain function, first-section dedupe, whole own-block rewrite

## .the fork

three shape calls in `src/utils/defineExpectedGitattributesContents.ts`, each raised by peer review r11:

- **factory or plain function.** a `genGitattributesDeclarer({ declarer, sections })` factory that returns `check` and `fix`, or each declarer calls the plain util from its own `check` and `fix`.
- **dedupe.** an entry two sections share lands once (first or last section), or in each section. ruled at i005: in each section; see below.
- **own-block rewrite.** a declarer rewrites its whole tagged block on fix, or patches only the lines that drifted.

## .taken: plain function · first section · whole block

- **plain function.** the `.gitignore` declarers, the extant pattern for a multi-declarer file in this repo, call a plain util from each `check` and `fix`. a factory for one file family would make two patterns for one job (`rule.prefer.wet-over-dry`); each declarer is five lines today
- **no dedupe (revised).** a dedupe must edit a foreign section to drop its copy, and a probe in peer review r011 (i005) showed it then dropped a repeated line from another declarer's block and a comment-only tagged block whole, so "a fix keeps a foreign section byte for byte" was false. the dedupe existed only to skip a benign repeat (`rule.require.fewer-paths-via-idempotency`): two identical collapse lines above every exception are inert under last-match-wins. it is removed; the convergence clamp and `[case1]` hold with rds and dynamodb each in its own section
- **a named order, not layers.** `declarersOrderedForGitattributes` lists each declarer at its place. a `layer` per section (base, collapse, exception) would still need an order inside each layer, so a list returns one level down; the named list is one line to read, and the util plus `[case3]` refuse a declarer it does not name. `[case3]` now also pins each declarer's literal and header tags to its practice dir, so a copied declaration with a stale literal fails
  - an `ordered`/`sortable` class split (collapse sections, then exception sections) would emit the same bytes today. it needs rhachet split into two sections and each section labeled; the list needs neither. the named list also fixes where a git merge rule sits relative to folds, which no fold class names. revisit when a sixth declarer arrives
- **header tag written out, not derived.** each `header.latest` holds its `# [<declarer>] ` tag in full. a util that prepends the tag would cut one copy, but the `retired` headers then mix tagged and untagged forms with no rule a reader can see, and the emitted header would no longer be greppable in the declaration. the three copies (literal, tag, dir) are now pinned by `[case3]`
- **whole block.** each declarer owns its tagged block exactly, so `check(x) ⟺ x === fix(x)` holds with exact equality. a line patch would need a diff model and would leave hand edits inside a managed block, which the next template change then fights. repo-own lines belong below the managed sections, where they are kept verbatim

## .rework: clean

each is internal to the util and the five declarers: no adopter file shape changes, except the dedupe call, which moves one shared line between two adjacent sections.

## .confidence: 80%, why not higher

the factory is a fair taste; it would cut five near-identical files to five calls. the call favors one pattern with the `.gitignore` declarers.

## .risk: none

no credential, no prod write: the code shape of a template util and line placement in a generated file.

## .where

raised by peer review r11 (enroll-impl-arch-defects) on 5.1 i003. files: `src/utils/defineExpectedGitattributesContents.ts`, `src/practices/*/best-practice/.gitattributes.declapract.ts`.
