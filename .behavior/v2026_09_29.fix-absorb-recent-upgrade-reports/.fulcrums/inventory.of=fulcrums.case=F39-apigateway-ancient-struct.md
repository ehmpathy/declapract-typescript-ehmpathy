# F39 — #650/#666: no apiGateway acceptance call pins `struct: { payload: 'ancient' }`

- **fork:** (a) hold #650 and #666 until sdk-aws-lambda#51 releases; (b) emit the default struct
  and accept a 500 on every apiGateway acceptance call; (c) emit `struct: { payload: 'ancient' }` at
  each apiGateway call site; (d) at the 0.7.2 floor, emit no pin and move the 400 reads to the
  nested contemp body in the same pass.
- **taken:** (d). sdk-aws-lambda#51 shipped in 0.7.2: a contemp frame to api gateway now answers
  400, not 500. the pin had one reason, and that reason is gone. the pin never released, so no
  consumer carries it and no migration is owed to undo it.
- **the shape, in `asSourceOnRunLambdaEndpoint`:**
  - every `runLambdaEndpoint.onSerialized` call takes the contemp default; no struct
  - in a moved file with no http call, each flat 400 read nests: `.errorMessage` → `.error.message`,
    `.errorType` → `.error.class`, `toHaveProperty('errorMessage')` → `toHaveProperty('error.message')`,
    and a `const { errorMessage } = JSON.parse(x) as { errorMessage: string }` destructure reads
    `error.message` under a cast that matches the body
  - a read off a real http response (`axios`, `fetch`, `.response.data`) stays flat: the wire still
    answers the flat body to a caller without `x-trail-exid`
  - a moved file that also makes an http call is not rewritten; each flat read gets a
    `// @declapract:review:` marker that names the move
  - `sdkAwsLambdaAskAncient` is untouched: it addresses live ancient peers, not this workaround
- **clamps:** unit cases 1, 4–8 (no pin; nested reads; http untouched; mixed file marked;
  fix(fix(x)) === fix(x)), red when the pin is re-added or the read move is skipped. real use:
  `asSourceOnRunLambdaEndpoint.declapract.integration.test.ts` runs the codemod's rewritten 400
  read against a real `genLambdaEndpoint.forApiGateway` handler via `runLambdaEndpoint` with no
  struct — green on 0.7.2, red on 0.7.1 (400 expected, 500 received).
- **rework:** clean — one codemod, no released artifact depends on it.
- **confidence 95%** — the 400 is proven by real use on 0.7.2 and the 500 on 0.7.1.
- **where:** `src/utils/asSourceOnRunLambdaEndpoint.ts`, `tests-service`,
  `tests-any/bad-practices/old-acceptance-test-utils*`.
- **verdict:** retire the pin; reason: sdk-aws-lambda#51 shipped in 0.7.2, and the pin never
  released (foreman, `.foreman/verdict.650-pin-drop-on-0.7.2.md`, which supersedes
  `verdict.650-pin-under-51-rules.md`). no fast follow, no dream.
