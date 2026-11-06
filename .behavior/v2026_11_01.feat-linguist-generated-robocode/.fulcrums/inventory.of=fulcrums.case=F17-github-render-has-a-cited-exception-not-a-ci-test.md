# F17: the github render carries a cited exception, not an automated integration test

## .the fork

- **A. a cited exception in the vision; the pilot pr is the real call.** the suites prove what git computes (`git check-attr`, `git diff --numstat`). the vision records why no automated test calls github for the render, and the handoff names the one real observation: the pilot pr, read by a human.
- **B. an integration test that pushes a scratch branch to a sandbox repo, opens a pr, and reads the render.** each ci run pushes, opens, reads, and closes.
- **C. language stats as the real call.** push to a sandbox repo's default branch and read `GET /repos/{owner}/{repo}/languages`, which linguist feeds and which excludes `linguist-generated` files.

## .taken: A

- no github api reports the fold. the pr files endpoint returns `sha, filename, status, additions, deletions, changes, blob_url, raw_url, contents_url, patch, previous_filename`; none marks a generated file (docs.github.com, rest/pulls, list-pull-requests-files). github's own docs say only that such files are "hidden by default in diffs" and kept from "counting toward the repository language" (docs.github.com, customizing how changed files appear on github)
- so B can only assert on scraped html of the pr page: a surface github may change on any deploy, with no contract. a test against it would flake on github's markup, not on this practice
- B and C each need a sandbox repo the org owns and a write token in ci. this repo holds neither; to create them is the foreman's call, not the driver's
- C proves one surface (language stats), not the render the wish names

## .rework: clean

if the director wants B or C, it lands as one new test file plus a ci secret, with no change to any practice.

## .confidence: 70%, why not higher

the reviewer reads `rule.require.external-contract-integration-tests` as owed regardless. the rule also allows a documented exception. whether this one suffices is the director's call.

## .risk: none

no credential, no prod write. the choice adds no code; the pilot pr runs under the human's own session.

## .where

`1.vision.yield.md` § the external contract and its exception; `5.3.verification.handoff.v1.to_foreman.md`. raised by peer review r3 (mech-external-contracts), blocker 1, on 5.3 i001.
