# F11: where does the main-review clamp live?

## .the fork
- beside its template: `best-practice/provision/github.repo/resources.ts.declapract.test.ts`
- at the practice root, as `github-environment-set.declapract.test.ts` does

## .taken
beside its template. `rule.require.collocate-clamp-tests` asks for it, and the first execution
review (r1) raised the root placement against that rule. `declapract compile` strips every
`*.declapract.test.ts`, proven: `dist/` holds `resources.ts` alone.

## .rework
clean. a move is one rename and one `__dirname` path.

## .confidence
85%. the root peers predate the collocate rule; the rule, not the precedent, decides.

## .verdict
best-guessed.
