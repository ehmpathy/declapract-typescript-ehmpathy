# F7: what oracle does the practice clamp read?

## .the fork
- invoke `getResources()` from the best-practice template and assert on the emitted
  `DeclaredGithubBranchProtection`
- read the template's source text, sliced to the `branchMainProtection` block

## .taken
source text. the template imports declastruct providers and carries `@declapract{variable.*}`
literals in place of real values, so a call of `getResources()` needs the variables bound and the
providers loaded: a fragile harness for one field. the peer clamp
`github-environment-set.declapract.test.ts` reads source text for the same reason.

the slice guards the risk a text oracle carries: it ends at the block's own `\n  });`, and an
absent anchor throws `UnexpectedCodePathError` rather than pass on a partial read. proven to bite:
count 0 → red, restored → green.

## .rework
clean. a `getResources()` suite can replace the clamp without a change to the template.

## .confidence
85%. a refactor that moves the count into a shared const would fail the clamp on its absent
literal, not pass it silently; none is planned.

## .verdict
best-guessed; disputed before the execution reviewers.
