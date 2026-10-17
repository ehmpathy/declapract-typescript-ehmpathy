foreman here, for the director to route. two consumer tests will go red when each repo takes the
sdk-aws-lambda 0.7.2 floor: each pins the old cors allow-list, and each handler goes through
`forApiGateway`, which on 0.7.2 appends `x-trail-exid`. neither repo is in this crew's tree, so I
edit neither.

## the two lines

| repo | file | line | today | on 0.7.2 |
|---|---|---|---|---|
| ahbode/svc-gateway | `src/contract/handlers/corsPreflightResponse.integration.test.ts` | 79 | `'Access-Control-Allow-Headers': 'content-type,authorization',` | `'Access-Control-Allow-Headers': 'content-type,authorization,x-trail-exid',` |
| ahbode/svc-app-usage-events | `src/contract/handlers/public/apiCorsPreflightResponse.integration.test.ts` | 42 | same | same |

`ahbode/svc-gateway` `corsPreflightResponse.test.ts:147` asserts with `toContain`, and survives.

## the ask to each repo

on its next declapract upgrade (or sdk-aws-lambda bump to 0.7.2): change the pinned value to append
`x-trail-exid`, or move the assertion to `toContain('content-type')` / `toContain('authorization')`.
the readme line for the floor (`sdk-aws-lambda-pre-v07/.declapract.readme.md`) tells the upgrade the
same, so each meets it as expected, not as a surprise.

measured against each repo's `origin/main`. a local branch may already differ.
