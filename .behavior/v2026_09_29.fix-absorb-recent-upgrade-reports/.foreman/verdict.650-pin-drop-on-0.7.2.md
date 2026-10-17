foreman here. sdk-aws-lambda#51 shipped as 0.7.2. this note SUPERSEDES the "ship now with the pin,
fast follow" call in `verdict.650-pin-under-51-rules.md`. the fast follow lands in THIS pass.

## the call

**drop the ancient pin from the #650 codemod now, and move its api gateway 400 assertions to the
nested contemp body in the same pass, at the 0.7.2 floor.** no fast follow, no dream.

why, under the rules:

- **end state.** the end state was always "no pin, nested assertions". the pin existed only because
  0.7.1 500s a contemp api gateway frame. 0.7.2 removes that cause, so the pin is a migration step
  with no remaining reason (`rule.require.end-state-design`).
- **no consumer owes it compat.** `src/utils/asSourceOnRunLambdaEndpoint.ts` is new in this round
  and absent from HEAD. no release ever emitted the pin, so no adopter repo carries it. ship it now
  and the fast follow becomes a second migration across 100+ repos, written to undo a line we
  chose to ship. that is `rule.forbid.migration-exceptions` in its plainest form.
- **explicit intent.** the #51 record says #650 drops the pin and updates its assertions in the same
  pass. the human's "fast follow" answered "do we wait on #51?", and #51 is no longer pending
  (`rule.require.explicit-intent-over-inferred`).

## what the pass owes

1. **floor.** node-service already declares `check.minVersion('0.7.2')` in this round's diff. keep
   it. no floor below 0.7.2 may ship with an unpinned codemod.
2. **drop the pin.** in `asSourceOnRunLambdaEndpoint.ts`, remove the `struct: { payload: 'ancient' }`
   emission, the `isApiGateway` heuristic it rides on (if no other branch uses it), and the
   `MARKER_UNREAD_EVENT` review marker. the two pin gaps (an inline object-literal event, a
   non-literal argument) close themselves: no pin, no detection owed.
3. **rewrite the flat 400 reads, in files the codemod moved.** the contemp body is
   `{ error: { class, message } }`:
   - `body.errorMessage` → `body.error.message`; `body.errorType` → `body.error.class`
   - `toHaveProperty('errorMessage')` → `toHaveProperty('error.message')` (and errorType likewise)
   - `const { errorMessage } = JSON.parse(result.body) as { errorMessage: string }` →
     read `error.message` from the parsed body; do not leave a renamed local that lies about its shape
   these are the real shapes in consumer suites (sampled from ahbode/svc-gateway blackbox/rest).
4. **🔴 do NOT rewrite a read of the real http wire.** real api gateway still sends the raw ancient
   event and still answers with the flat body; that is a shipped consumer, and compat is owed to it.
   a read off `axios`/`fetch`/an http response (e.g. svc-notifications
   `(error as any).response.data.errorMessage`) is NOT a `runLambdaEndpoint` result, and must stay
   flat. so:
   - rewrite only in a file where the codemod emitted the `runLambdaEndpoint` call and the file
     makes no http call;
   - in a file that mixes both, rewrite no read; emit a `@declapract:review` marker on each flat
     read that names the move ("if this reads a runLambdaEndpoint result, it is now
     `error.message` / `error.class` on sdk-aws-lambda >= 0.7.2; an http response stays flat").
5. **leave `sdkAwsLambdaAskAncient` alone.** it addresses real ancient peers that publish `-dev-` and
   read a flat event. that is a live wire with live consumers, not the #650 workaround.
6. **clamps, with teeth** (`rule.require.clamp-edge-cases`):
   - an api gateway call: after the fix, no `struct: { payload: 'ancient' }` appears; re-add the pin
     emission and it goes red
   - a flat read in a moved file becomes nested; a flat read off an http response is untouched; a
     mixed file gets the marker and no rewrite
   - fix(fix(x)) === fix(x), on each case
   - proof by real use: run one rewritten api gateway 400 assertion against a real
     `genLambdaEndpoint.forApiGateway` handler on 0.7.2, via `runLambdaEndpoint` with no struct. it
     must pass. on 0.7.1 it must fail (the 500). that is the clamp that proves the pin's cause is gone
7. **records.** F39: retire the pin; reason "sdk-aws-lambda#51 shipped in 0.7.2; the pin never
   released". strike the fast-follow dream if it was caught. resnap the codemod snapshots.

## the genTrailMiddleware hazard

0.7.2 makes bare `genTrailMiddleware()` a compile error (callers must pass `{ carrier: 'wrapper' }`).
measured:

- zero calls in any practice template or fixture in `src/`
- zero code calls across `ehmpathy/*` outside sdk-aws-lambda itself, and zero across `ahbode/*` (only
  docs and route yields name it)
- consumers compose it through `genLambdaEndpoint`, never directly

so the 0.7.2 floor breaks no template and no known consumer. no practice change is owed.

**upstream candidate, for the director to route:** sdk-aws-lambda shipped a breaking change as a patch
(0.7.1 → 0.7.2). a consumer with a `^0.7.1` range takes it unasked. report it to sdk-aws-lambda as a
semver defect; it is theirs, not this repo's.

## gates

none new. code, tests, snapshots and fulcrum prose, inside the open grant's lane. this reopens
work in the 5.1 lane after 5.1 passed, so 5.3's peer lanes will see the change; the one commit still
lands only after 5.3 passes.
