foreman here. one more 0.7.2 fact: `forApiGateway` now lists `x-trail-exid` in the
`Access-Control-Allow-Headers` of every cors response. this note adds to
`verdict.650-pin-drop-on-0.7.2.md`; that verdict stands.

## measured

- **this repo pins no cors response header.** zero hits for `Access-Control-`, `allow-headers` or
  `x-trail-exid` in `src/`. the only `cors` hits are source-text snapshots of `cors: true` config in
  `simple-lambda-handlers`, which never run the sdk, so 0.7.2 diffs none of them. #650 emits no
  header assertion. 5.3 sees no change from this.
- **two consumers pin the old list, and both go through `forApiGateway`, so both will diff:**
  - `ahbode/svc-gateway` `src/contract/handlers/corsPreflightResponse.integration.test.ts:79`:
    `'Access-Control-Allow-Headers': 'content-type,authorization'` → red on 0.7.2
  - `ahbode/svc-app-usage-events`
    `src/contract/handlers/public/apiCorsPreflightResponse.integration.test.ts:42`: same line,
    same diff
  - `ahbode/svc-gateway` `corsPreflightResponse.test.ts:147` uses `toContain`; it survives
- `ehmpathy/*`: only sdk-aws-lambda itself pins it, already at `content-type,authorization,x-trail-exid`.

## the call

**no codemod. a note, in the place an upgrade reads it.**

- the new header is correct behavior with a live reason (a browser preflight for `x-trail-exid`
  must succeed). a test that pins the old list asserts a stale contract. the repair is the
  consumer's test, which sees one line red, and the red diff names the fix.
- a fixer would rewrite an author-owned header string. the sdk appends `x-trail-exid` to whatever
  list the author set, so the right new value differs per repo; a blind string rewrite is unsafe,
  and two known sites do not earn a practice (`rule.prefer.wet-over-dry`).
- what the floor bump owes is to make that one red line expected, not a surprise:
  1. add one line to `src/practices/node-service/bad-practices/sdk-aws-lambda-pre-v07/.declapract.readme.md`
     (the readme an adopter reads for this floor): "on sdk-aws-lambda >= 0.7.2, a cors-configured
     `forApiGateway` endpoint lists `x-trail-exid` in `Access-Control-Allow-Headers`. a test that
     pins the old list goes red; append `x-trail-exid`, or assert with `toContain`."
  2. the same sentence in the release PR body, under the 0.7.2 floor bump.
- that is prose only. no code, test or snapshot moves, so 5.3's reviews are not reopened by it.

## the other 0.7.2 additions

`asApiGatewayHeaders` and `askLambdaEndpoint.viaApiGateway` are new capabilities. no practice
relies on them, and adoption is a feature, outside this wish (defects the next upgrade trips on).
sqs is unchanged. no action this round. if a later round wants adhoc http callers of a peer's api
gateway moved onto `viaApiGateway`, that is its own wish.

## for the director to route

the two consumer test lines above are each repo's to update on its next upgrade. no gate here.
