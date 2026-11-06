# F2: route collapse covers `.behavior/` as well as `.route/`

## .the fork

- **A. literal** — collapse `.route/**` only, as the wish words it.
- **B. every route root** — collapse `.route/**` and `.behavior/**`, with the same yield + radio exceptions.

## .taken: B

a route is a route whatever its root; `.behavior/` is the behaver variant. every route in this repo sits under `.behavior/`, so under A the pilot pr here would show near-zero route collapse. in pr #748, the only `.route/` matches would be the route machinery subdir (`.behavior/<route>/.route/passage.jsonl`, and only under a `**/.route/**` read). the stones, guards, stamps, and fulcrums would all stay open.

## .rework: clean

one line in the rhachet section, and its test case.

## .confidence: 70%, why low

the wish names `.route/` explicitly. the wisher may want behavior routes, whose stones carry the wish and vision prose, to stay open. asked as Q1.

## .risk: none

no credential, no prod write: two glob lines in a shipped template.

## .where

`1.vision.yield.md` § the contract, rhachet section.
