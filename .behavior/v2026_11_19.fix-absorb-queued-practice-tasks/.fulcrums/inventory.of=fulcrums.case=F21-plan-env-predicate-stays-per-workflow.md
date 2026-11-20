# F21 — the "plan env equals apply env on main/tag" predicate stays per workflow

## .the fork
- a: default `.declastruct.yml`'s plan environment to the apply's, and drop the six copies
- b: keep the predicate in each of the six `provision.yml` call sites (#785); catch a dream

## .taken
b. a changes the environment a pull-request plan runs in, for every adopter: a policy call on which environment's secrets a pr plan may read. #785 asks only that main and tag plans match the apply. each copy is clamped by `provision-github/github-plan-environment…`.

## .rework
dirty. the shared reusable workflow's input contract changes; every caller's `provision.yml` changes.

## .confidence — 85%, why not higher
the duplication is real; the policy call is not ours to make in an absorb.

## .where
`cicd-{service,package,app-react-native-expo}/best-practice/.github/workflows/provision.yml`; dream `v2026_11_19.reseed.plan-env-defaults-to-apply-env`

## .verdict
— (awaits review)
