# S18 — no overgranular maintenance farms; key health is not a ci job

## .said

on the `provision.yml` pull_request path gate (#687):

> thats overkill. drop it and forbid accrual of overgranular maintenance farms. keep it simple.

on the `preflight-keys` job (#585):

> expired keys should be detected by the authors of the tests suites, not cicd

> or, we can ask keyrack to extend support to healthcheck keys

> but not cicd

> enrule this

## .settled

- a practice ships no hand-kept list or job whose only payoff is a saved ci minute or an earlier
  diagnosis. the cost of each line is paid by every adopter, on every upgrade, forever.
- the `provision.yml` path gate is dropped: its list must track every plan input of every adopter,
  and it saves naught until a cluster runs at min 0.
- the llm key preflight is dropped. a rejected key is the test suite author's to detect, or
  keyrack's to healthcheck. ci never probes key health.

## .landed

- `provision.yml` template: bare `pull_request:`; #687 not planned
- `.test.yml` template: no `preflight-keys` job; `preflight-keys.sh` and its play test removed; #585
  not planned
- `rule.forbid.overgranular-maintenance-farms.md`, `rule.forbid.key-health-checks-in-cicd.md`
- a keyrack healthcheck task for ehmpathy/rhachet, held in `.radio/` until the radio lifts
- F61, F64 ruled
