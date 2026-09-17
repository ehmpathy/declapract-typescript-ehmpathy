# fulcrum F-jest-env-mutation-strategy — how the jest acceptance env applies AWS creds

- rework = clean
- status = open
- confidence = 70%

## the fork, stated fairly

`spliceAwsStaticCredsIntoEnv` (tests-node/best-practice/jest.acceptance.env.aws.ts) mutates the injected
`context.env` in place: it splices `AWS_*` cred vars and `delete`s `AWS_PROFILE`. two shapes:

- **A — in-place splice (current).** mutate the injected worker env directly, `delete AWS_PROFILE` so
  aws-sdk v2 does not prefer the profile over the spliced static creds. simple, and the env is the
  worker's own record.
- **B — return a fresh merged env, assign once at the call site.** the splice + delete produce a new
  record; the call site assigns it once. the mutation is then explicit and local, per the reviewer's
  ergonomic preference (i035 r006.n2 / r007.b2).

## what I took, and why (at the time)

took A (the extant in-place form). it is correct and bounded: the env is injected (`context.env`), not
global `process.env`, so the blast radius is one jest worker's lifetime, and `delete AWS_PROFILE` carries
load (a restore would reintroduce the v2-prefers-profile bug the splice exists to fix). no defect ships,
so a rework to B is an ergonomic, not a fix.

## rework, and why clean

the call site assigns the returned record once — a local swap from mutate-in-place to
compute-then-assign, no caller hardened against the in-place form, no data moved. so clean.

## where

- `src/practices/tests-node/best-practice/jest.acceptance.env.aws.ts` (spliceAwsStaticCredsIntoEnv)
- `.dream/v2026_09_10.fix.jest-aws-creds-process-env-mutation.md` (the paired dream)

## the owner roster row

the acceptance-env AWS-cred cluster (kin to #564 AWS_PROFILE / keyrack). the mixed-v2/v3 worker hazard
the dream names is the deeper driver; this fork is its in-place-vs-fresh-record tail.

## verdict

_pending council._
