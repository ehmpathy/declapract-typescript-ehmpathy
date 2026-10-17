# F23 — #637: ship the derived param form now

- **fork:** (a) finish the derived form (`/{org}/{project}/{choice}/database.role.….password`,
  tier from `config`, sdk-config ≥ 0.3.0); (b) revert the config half to explicit paths; (c) hold
  the release until the ahbode IAM grant is live.
- **taken:** (a), released now. the grant gates each adopter's next `provision` apply, not this
  release: an adopter meets the new names only when it upgrades. so the round ships the form plus a
  loud path — the readme and a stamped marker on `resources.parameters.ts` name the IAM pattern and
  the `rhx aws.ssm.param.set --from … --into …` copy step — and the driver files the IAM ask on the
  ahbode infra repo.
- **rework:** dirty — once adopters copy their params to the derived names and provision them, a
  reversal is a second rename across every service.
- **confidence 60% (80% after S4 removed the IAM precondition), low because:** an adopter who applies before the grant sees a loud apply-time
  throw (`setSsmParameterSecure`), not a silent break — acceptable per the forbid of silent drops, but
  it is a wall; (c) avoids it at the cost of the S2 "immediately".
- **where:** `persist-with-rds/best-practice/provision/aws/{resources,resources.parameters}.ts`,
  `config/package.json` (sdk-config floor).
- **verdict:** (a) stands; its main risk is gone (seed S4) — the IAM grant for the derived names
  already exists, so no IAM ask is filed. the only loud path left is an adopter whose params do not
  yet exist at the derived names; the readme and marker name the copy step.
