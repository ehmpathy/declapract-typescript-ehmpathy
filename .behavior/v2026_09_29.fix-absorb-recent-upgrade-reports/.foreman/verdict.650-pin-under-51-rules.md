foreman here. #650's ancient pin, firmed up against the full text of the #51 foreman's rules
(`.temp/foreman-rules.from-sdk-aws-lambda/`). this note SUPERSEDES the "#650 under the #51 rules
(provisional)" section of `verdict.5.1-disputed-blockers-i004.md`. the 38-dispute verdict above it
stands unchanged.

## withdrawn: "the pin stays, because ancient is the production wire"

that reframe was my inference, laid over explicit statements. `rule.forbid.inferred-intent-overrides`
names it: the paternal callee ("they asked for X, but they actually need Y"). the explicit
statements, each of which binds (`rule.require.explicit-intent-over-inferred`):

1. the #51 record (`rule.require.end-state-design`, the F1 incident): #650 drops
   `struct: { payload: 'ancient' }` and updates its assertions in the same pass. "a downstream
   assertion that relies on a workaround" is "the migration's to update".
2. the human, here: ship now, fast follow.
3. the #51 commander: a contemp caller gets the contemp body, nested, no backcompat.

## the call, firmed

- **ship #650 now with the pin.** the human stated it. on published 0.7.1 the contemp frame to api
  gateway 500s, so a test without the pin cannot pass today. the pin lives in consumer tests, not
  in any sdk; it adds no permanent mechanism upstream, so `rule.forbid.migration-exceptions` does not
  fire on it.
- **the pin is a workaround, and F39 says so.** its reason: "0.7.1 500s a contemp frame to api
  gateway (sdk-aws-lambda#51). the pin is retired by the fast follow, once #51 releases." strike
  the "keep it on its merit" clause from F39's rework; it was the inference above.
- **the fast follow is as you first wrote it.** once #51 releases, one practice pass, in one
  apply: drop every `struct: { payload: 'ancient' }` the codemod emitted, AND rewrite each
  `errorMessage` / `errorType` read in the same file to `error.message` / `error.class`. never the
  drop alone. the #51 end state hands that cost to declapract, which is what declapract is for.
- **the two pin gaps still get closed now** (`verdict.650-ancient-pin-vs-51.md` item 1). an
  unpinned api gateway call 500s on 0.7.1 today, so a gap is a red test in an adopter's next
  upgrade. the review marker for the unreadable case names the move ("an api gateway event here
  needs `struct: { payload: 'ancient' }` until sdk-aws-lambda#51; drop it with the fast follow").

## the dream, written now

catch it as FAST FOLLOW, owner this repo: "once sdk-aws-lambda#51 releases: a bad-practice that
detects `struct: { payload: 'ancient' }` on a `runLambdaEndpoint` call to an api gateway endpoint,
whose fix drops the struct and rewrites each `errorMessage` / `errorType` read in the file to
`error.message` / `error.class`. floor: the #51 release. clamp: a 400 assertion red before the fix
on the #51 release, green after, and fix(fix(x)) === fix(x)."

no gates. code, tests, and fulcrum prose, inside the open grant's lane.
