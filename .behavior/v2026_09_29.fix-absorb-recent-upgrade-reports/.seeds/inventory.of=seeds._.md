# inventory.of=seeds

axis: the wisher's words that changed the scope or a verdict of this round.

| case | what it settled | landed |
|------|-----------------|--------|
| S1 | no practice runs `terraform fmt`; #645 is fixed by removal | inventory, yield, F2 |
| S2 | window = past two weeks; every report fixed this round; wisher calls become fulcrums | dimensions, inventory, yield |
| S3 | the playwright work (#603, #604, #617) waits for app-protools-native's latest work | dimensions, inventory, yield, F13, F15, F32 |
| S4 | the derived param names already have their IAM grant; #637 has no IAM precondition | inventory, case=12, yield, F23 |
| S5 | no work in other repos; lean only on releases already published | dimensions, inventory, yield, F7, F8, F11, F21, F25, F29, F33 |
| S6 | the review brain is `openrouter/deepseek/flash`; openrouter and sdk-aws-lambda upgraded — 0.7.1 is published, so the lambda cluster lands | guards, package.json, inventory, case=0, case=4, case=8, yield, F7, F8, F33 |
| S7 | the latest dispatches (#653–#670) join the round on the same contract | inventory, demos (case=0, 1, 2, 7, 8, 10, 14), yield, F34–F45, `refs/research.dispatches-653-670.md` |
| S8 | the dispatches through 2026-10-07 (#671–#675) join the round on the same contract | inventory, demos (case=1, 4, 9), yield, F46–F50, `refs/research.dispatches-671-675.md` |
| S9 | the dispatches through 2026-10-11 (#676–#680) join the round on the same contract; a rebase onto an unmoved main is a no-op | inventory, demos (case=4, 8, 10), yield, F51–F55, `refs/research.dispatches-676-680.md` |

| S10 | a stale or failed patch warns, never blocks an upgrade; #680 takes both pnpm keys | F55, inventory row 680, case=8, yield, blocker |

| S11 | #679 is forwards compat only: the new test suffixes are accepted beside the old; no file is renamed | F54, inventory row 679, yield, blocker |

| S12 | the dispatches through 2026-10-14 (#681–#690) join the round; #682 holds on unshipped upstream work | inventory, demos (case=2, 4, 5, 12), yield, F57–F63, `refs/research.dispatches-681-690.md` |

| S13 | every open upgrade report joins the round, older ones too; the old lambda test lib retires for sdk-aws-lambda (#650, #666); the round ends in a release | inventory (126), demos (case=1, 4, 12, 13), yield, blocker, F64–F87, four dreams, `refs/research.dispatches-open-before-window.md` |

| S14 | the template type-check clamp lands in this round, not as a dream | F88, inventory § maintainer clamp, yield, case=6 |

| S15 | the #557 rename is a future todo; this round's release keeps the current package name | F83 (ruled), inventory D2 row 557, the rename dream |

| S16 | the timestamp hook takes zero exemptions, ever; a lock hook halts any commit while it differs from the practice; its reason is privacy | `check.timestamps.sh`, `check.timestamps.lock.sh`, `pre-commit`, F89, inventory row 684 |

| S17 | the round lands as one commit, after the peers pass; the `closes #NNN` list stays one line per issue | vision contract item 3, `release.commits.md`, blocker |

| S18 | no overgranular maintenance farm ships in a practice; the #687 path gate and the #585 key preflight are dropped; key health belongs to the suite author or keyrack, never ci | `provision.yml`, `.test.yml`, two rules, the keyrack task, F61, F64 |

| S19 | the `.ref(by)` without `static <by>` check is a domain-objects lint, not a practice here; #634 defect 2 moves there | `ref-without-static-key` removed, domain integration test, `release.commits.md`, the domain-objects task, F24 |

| S20 | the commit-msg hook is a hard requirement; husky owns it, conventional-commits ships no `.husky/` file | husky hooks restored, `rule.require.commit-msg-hook-ships`, `huskyCommitMsgHook` clamp, `release.commits.md` #630 |

| S21 | sdk-aws-lambda 0.7.2 is published; the node-service floor and the patch floors move to it; #631's cast stays until sdk-aws-lambda#42 | node-service package.json, the pre-v07 / lambda-client / handlers / testing-methods floors, the boundary clamp |

| S22 | the repo that owns a cutover owns its follow-up ops; copium (a lazy workaround in a non-owner) is forbidden | `after_major_upgrade.sql` removed, engine-upgrade test, `rule.forbid.copium`, F105, `release.commits.md` #664 |

| S23 | the testdb utils are test assets in a `.test/assets/` dir; the jest env declares a port override the prod connection honors only with test access | the testdb move, `rule.forbid.test-assets-in-src`, `rule.forbid.copium`, F106, F108 |

| S24 | repo visibility fails closed; public only by an explicit `"private": false`; no fail-open publicity | provision-github `resources.ts` + test, `rule.forbid.fail-open-publicity`, F109 |

| S25 | the test-fns subpath stand-in stays this round, in `src/.test/assets/`; it retires once test-fns ships `typesVersions` | tests-expo stand-in + both prepare files + compile clamp, F113, the test-fns dream |

counts: 25 seeds, 25 landed, 0 gaps.
