# F11: where does the main-review clamp live?

## .the fork
- beside its template: `best-practice/provision/github.repo/resources.ts.declapract.test.ts`
- at the practice root, as `github-environment-set.declapract.test.ts` does

## .taken
beside its template. `rule.require.collocate-clamp-tests` asks for it, and the first execution
review (r1) raised the root placement against that rule. `declapract compile` strips every
`*.declapract.test.ts`, proven: `dist/` holds `resources.ts` alone.

it stays a unit clamp (`.declapract.test.ts`) that reads its template from disk, by design:

- the collocate rule names this exact shape: a unit clamp collocates, and an integration clamp may
  not, because compile strips `.declapract.test.ts` but not `.declapract.integration.test.ts`
- a rename to `.integration.test.ts` beside the template would ship it to every adopter as an
  EQUALS template (#583); the location clamp (`practiceTestFileLocation`) would go red
- its one read is its own subject, the template beside it, at module load; no network, no db, no
  shared state. four peer clamps read their template the same way (`github-environment-set`,
  `github-repo-visibility`, `boot-yml-findsert`, `.dpdmrc.yaml`)

## .rework
clean. a move is one rename and one `__dirname` path.

## .confidence
85%. the root peers predate the collocate rule; the rule, not the precedent, decides.

## .verdict
best-guessed.
