# fulcrum F1 — deploy.database.sh cicd db-user model under the plan/apply credential split

- rework = dirty
- status = open
- confidence = 55%

## the fork, stated fairly

the terraform→declastruct migration split the single `cicd` SSM credential into a readonly
`for-plan` and a writer `for-apply` slash-path pair (resources.parameters.ts:88-93). but
`deploy.database.sh` still creates ONE cicd db user from ONE dotted, stage-scoped param
(`.database.role.cicd.password`) that the go-forward store no longer declares. reconciling the two
forces a DB-user-model choice:

- **A — one cicd db user, one credential.** deploy.database.sh reads the `for-apply` slash name (it
  writes). `for-plan` stays a readonly IAM-role SSM read with no matching db user.
- **B — two cicd db users.** a plan-readonly user (from `for-plan`) + an apply-writer user (from
  `for-apply`); `.user.cicd.sql` and deploy.database.sh both grow a second user.

## what I took, and why (at the time)

took NEITHER in code — deferred, because both ripple past this round's scope (the i030
practice-defect roster) into the DB-user model, `.user.cicd.sql`, and the cicd workflow's
connection secrets. best-guess LEAN: option A (one user, `for-apply` name) is likely right, since
the split is an IAM-role distinction (which role may READ the SSM secret), not necessarily two DB
principals — but confidence is low (55%) because I did not read the plan/apply IAM roles' DB-connect
paths to confirm whether a plan role connects to the DB at all.

## rework, and why dirty

reversal after a guess would tear down a CREATE USER path and its grants — a stateful provisioning
change, not a name swap. so dirty.

## where

- `src/practices/persist-with-rds/best-practice/provision/schema/deploy.database.sh:44`
- `src/practices/persist-with-rds/best-practice/provision/aws/resources.parameters.ts:84-94`
- `src/practices/persist-with-rds/best-practice/provision/schema/init/.user.cicd.sql` (the ripple)

## the owning roster row

#591 (ssm slash-path cicd names, folds → vision case=7) owns the go-forward slash-path cicd naming.
this fork is that migration's deploy-command tail. settle it there.

## verdict

_pending council._
