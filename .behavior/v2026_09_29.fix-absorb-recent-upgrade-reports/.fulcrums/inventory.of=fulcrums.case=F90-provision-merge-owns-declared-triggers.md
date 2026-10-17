# F90 — #685/#687: the provision.yml merge owns each declared trigger whole

## .the fork

- **A:** a declared trigger (`pull_request`, `push`) is set to its declared shape whole. an adopter's
  own filter inside it (a `push.tags`, an extra branch) is replaced.
- **B:** merge one level deeper: within a declared trigger, set the declared keys and keep the
  adopter's other keys.

## .taken

A. undeclared triggers (`schedule:`, `workflow_dispatch` inputs) stay byte-for-byte; a declared
trigger is the practice's. the `pull_request.paths` gate (#687) is the reason the merge reaches into
triggers at all, and a deeper merge would let a stale adopter filter outvote it. provision runs on
the trunk, and no reporter has a custom `push` filter on it.

## .rework

clean. one more recursion level in `asWorkflowMergedByJob`, plus its unit cases.

## .confidence

75% — the trunk-only provision run makes a custom `push` filter rare, but not impossible.
