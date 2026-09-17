# fulcrum F-stage-rule-vs-scaffold — reconcile the forbid-stage rule with the dual-publish scaffold

- rework = clean
- status = open
- confidence = 75%

## the fork, stated fairly

two wisher-settled artifacts collide. `rule.forbid.stage-term.md` (as first written) forbids ANY
`accessByStage` / `deploymentBucketByStage` remap — "no remap, one axis" — with a blocker on a
divergent `stage` value. the serverless template SHIPS both maps, because wish decision 1 mandates
dual-publish (a `-dev-` fleet beside a `-prep-` fleet), and serverless names one stack per `--stage`
slug, so two published fleets REQUIRE two slugs, one of which (`dev`) diverges from access (`prep`)
through the transition. one of the two artifacts had to give. two shapes:

- **A — amend the RULE.** carve the dual-publish scaffold out as a second, narrow, self-retired
  allowed use; keep the teeth aimed at divergence OUTSIDE the scaffold and at a scaffold kept past
  the endpoint.
- **B — strike the scaffold from the TEMPLATE.** remove `accessByStage` / `deploymentBucketByStage`
  and publish a single `-prep-` fleet.

## what I took, and why (at the time)

took A (amend the rule). B reopens the exact fault the wish exists to close: a single-fleet publish
404s every cross-service call from an unmigrated `-dev-` peer through the transition — the flag-day
gamble decision 1 replaces with no-lockstep dual-publish. the rule was simply written more absolute
than the wish it serves; the template is correct. so the defect is in the rule, and the fix is to
amend it — not to strike a wisher-mandated scaffold.

## rework, and why clean

a doc-only edit to one rule file, reversible with no hardened caller: the rule is a review rubric,
not code a consumer depends on. if the council prefers B, the rule reverts to its absolute form and
the template loses its two maps — a clean swap either direction. so clean.

## where

- `.agent/repo=.this/role=any/briefs/rule.forbid.stage-term.md` (amended: `.what` exceptions,
  `.the second allowed use`, forbidden-shapes row, enforcement clause)
- `src/practices/serverless/best-practice/serverless.yml:12-20` (the two maps — the scaffold)
- `src/practices/serverless/best-practice/package.json` (deploy:release:ancient + :contemp — dual-publish live)
- the paired taken: `…i066.c4db983577ea4c3126.r001._.taken.by_self.repo-rules.md`

## the owner roster row

the north-star tier (wish decision 1 — dual-publish) + the durable guard the wish asks for ("forbid
a divergent stage"). this fork is where that guard meets the scaffold it must not block.

## verdict

_pending council._
