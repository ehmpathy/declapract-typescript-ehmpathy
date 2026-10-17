<!-- foreman draft. the driver owns the pr body; adopt, cut, or rewrite. source of the closes list:
     the `### fix(...)` headers in release.commits.md (104) plus #512 (served by #639's files) = 105.
     #571 is an index, closed by comment; #585 and #687 are not planned. 105 + #571 = the trace's 106. -->

# fix(practices): absorb the recent upgrade reports

the practice defects that recent declapract upgrades reported back (svc-chat, svc-notifications,
svc-quotes, whodis-client and peers), fixed so the next upgrade does not trip on them again. one
commit; `release.commits.md` in the route maps every changed path to the issue it serves.

## ⚠️ before you apply: a published package must declare `"private": false`

`provision-github` now provisions a repo **private** unless its `package.json` declares
`"private": false`. an absent key is backfilled as `"private": true` on the next apply, so
`npm publish` refuses and the repo goes private.

**if your package publishes to npm, add `"private": false` to `package.json` before you apply.**

measured across ehmpathy and whodisio: 93 packages that publish to npm declare no `private` key
and would stop on their next apply; 5 already declare `false`. this repo declares `false`.

## ⚠️ apply twice

the rhachet practice adds `rhachet-brains-openrouter` to every adopter. declapract writes a dep the
repo lacks as its raw `@declapract{check.minVersion(...)}` marker, which `pnpm install` rejects;
the next apply resolves it. **run `npx declapract apply` twice**, then install. the fix belongs to
ehmpathy/declapract.

## what an adopter meets on the next apply

- **sdk-aws-lambda floor is 0.7.2**, in node-service and in each practice that patches or moves an
  sdk-aws-lambda caller (the pre-v07, lambda-client, lambda-handler and lambda-test-method
  practices). #631's cast stays until sdk-aws-lambda#42. the `#650` codemod moves acceptance and
  integration tests onto `runLambdaEndpoint` with no `struct: { payload: 'ancient' }` pin: 0.7.2
  answers a contemp api gateway frame correctly (sdk-aws-lambda#51).
  - a 400 read off a moved `runLambdaEndpoint` call becomes the nested body:
    `errorMessage` → `error.message`, `errorType` → `error.class`
  - a read off a real http response stays flat (real api gateway still sends the raw event)
  - a file that mixes both gets a `@declapract:review` marker on each flat read, and no rewrite
- **cors:** on sdk-aws-lambda >= 0.7.2, a cors-configured `forApiGateway` endpoint lists
  `x-trail-exid` in `Access-Control-Allow-Headers`. a test that pins the old list goes red; append
  `x-trail-exid`, or assert with `toContain`.
- **heads-up from sdk-aws-lambda 0.7.2:** a bare `genTrailMiddleware()` no longer compiles (callers
  pass `{ carrier: 'wrapper' }`). no practice template and no known consumer calls it directly;
  handlers reach it through `genLambdaEndpoint`.
- **husky:** the timestamp hook blocks every timestamp in every tracked file, prose included, with
  zero exemptions; a new `check.timestamps.lock.sh` halts any commit while the hook differs from the
  practice. a new `check.secrets.sh` blocks a staged secret.

## closes

closes #487, closes #491, closes #512, closes #514, closes #516, closes #517, closes #519,
closes #520, closes #523, closes #530, closes #532, closes #536, closes #539, closes #540,
closes #541, closes #544, closes #545, closes #548, closes #550, closes #551, closes #552,
closes #553, closes #556, closes #558, closes #562, closes #565, closes #600, closes #601,
closes #607, closes #608, closes #609, closes #610, closes #611, closes #612, closes #616,
closes #618, closes #619, closes #620, closes #621, closes #622, closes #623, closes #624,
closes #625, closes #626, closes #627, closes #628, closes #629, closes #630, closes #631,
closes #632, closes #633, closes #634, closes #635, closes #636, closes #637, closes #638,
closes #639, closes #640, closes #641, closes #642, closes #643, closes #644, closes #645,
closes #646, closes #647, closes #648, closes #649, closes #650, closes #651, closes #652,
closes #653, closes #654, closes #655, closes #656, closes #657, closes #658, closes #659,
closes #660, closes #661, closes #662, closes #663, closes #664, closes #665, closes #666,
closes #667, closes #668, closes #669, closes #670, closes #671, closes #672, closes #673,
closes #674, closes #675, closes #676, closes #678, closes #679, closes #680, closes #681,
closes #683, closes #684, closes #685, closes #686, closes #688, closes #689, closes #690

## closed or held by comment, not by this commit

- #571: an index; closed by comment once its members close
- #585, #687: not planned (see each issue's comment)
- the D0 set (#613, #599, #575, #524, #518, #492, #490, #584, #546): fixed in earlier releases;
  closed by comment that names the commit
- the D2 set (#603, #604, #617, #677, #682, #582, #557, #513, #567): held open, with what each waits on

drafts for every comment: `release.comments.md` in the route.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
