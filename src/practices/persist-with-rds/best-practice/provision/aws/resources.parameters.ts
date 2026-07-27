import { DeclaredAwsSsmParameterSecure } from 'declastruct-aws';
import { getEnvironment } from 'sdk-environment';

/**
 * .what = the secret ssm parameters this service manages via declastruct.
 * .why = these params were migrated off terraform (provision/aws/product/parameter-store.tf,
 *        now a forget). declastruct-aws owns them. every param is a real secret, so each is a
 *        DeclaredAwsSsmParameterSecure (write-only): the plan role reads metadata only
 *        (DescribeParameters + ListTagsForResource — no GetParameter, no kms:Decrypt), and the
 *        value is never read back.
 * .note = adoption supplies NO `value`: the live values were seeded once by terraform and live
 *         only in aws. a value-less secret is write-only KEEP, so plan reports KEEP for extant
 *         params and never rewrites them. a CREATE at plan means the name does not match a live
 *         param — stop and fix. (a value-less secret that is ABSENT throws on apply, per
 *         declastruct-aws setSsmParameterSecure. only prep + prod apply this wish — there is no
 *         aws-test-declastruct job — so the params are declared for every tier without a
 *         conditional, and the absent-throw never triggers in test.)
 * .scope = only the db-role credentials the service + migrations use are managed here. any
 *          service-specific secrets (third-party api keys, etc) are declared alongside these by
 *          the service that owns them. legacy param names with zero consumers are left unmanaged
 *          (terraform forgets them, no delete touches the live values) and can be pruned from aws
 *          once confirmed unreferenced everywhere.
 */

/**
 * .what = the conformed environment this wish runs in (access ∈ test | prep | prod).
 * .why = resolved once, as a module global, via sdk-environment's getEnvironment (reads the
 *        ACCESS envar). the wish speaks the org-standard access vocab everywhere it can.
 */
const { access } = getEnvironment.static();

/**
 * .what = the legacy terraform stage label used inside the live param NAMES.
 * .why = terraform seeded these params under var.environment, where the prep account carried the
 *        legacy `dev` label (see define.infrastructure-dev-vs-application-prep). the live param
 *        names contain that literal string, so the dotted namespace casts prep→dev. test/prod are
 *        unchanged. (tags do NOT cast — they conform to the access vocab; see `secret` below.)
 */
const stage = access === 'prep' ? 'dev' : access;

/**
 * .what = declare a secret ssm parameter for adoption (write-only, default key).
 * .why = every param here is a secret whose value already lives in aws; we supply no `value` so
 *        plan KEEPs the extant value and never reads or rewrites it. keyId=null selects the
 *        account default aws/ssm key (what terraform used, no kms_key_id). tags conform to the
 *        org access vocab (`prep`, not the legacy `dev`), so the first apply reconciles the live
 *        `environment` tag from dev→prep (a metadata-only change, no value write).
 */
const secret = (name: string): DeclaredAwsSsmParameterSecure =>
  DeclaredAwsSsmParameterSecure.as({
    name,
    keyId: null, // default aws/ssm key (matches the terraform resources)
    description: null,
    tags: {
      app: '@declapract{variable.organizationName}',
      environment: access,
      product: '@declapract{variable.projectName}',
    },
    // no `value` → write-only KEEP: adopt the live value, never read or rewrite it
  });

/**
 * .what = the full set of secret ssm parameters this wish declares.
 * .why = the db-role credentials the service + migrations use. declared for every access tier —
 *        no per-tier conditional. only prep + prod ever APPLY this wish (there is no
 *        aws-test-declastruct provision job — see .github/workflows/provision.yml), so the
 *        value-less-absent throw on apply cannot trigger in test. test sources its non-sensitive
 *        db creds straight from config/test.json and never reconciles these params.
 * .note = the for-plan credential is the plan role's one decrypt exception; its name is pinned in
 *         the prod plan role's iam policy, so it MUST stay byte-identical.
 */
export const getParameters = (): DeclaredAwsSsmParameterSecure[] => {
  // dotted namespace that prefixes the env-scoped param names
  // keep in sync with terraform local.parameter_store_namespace + config/${env}.json
  const namespace = `@declapract{variable.organizationName}.@declapract{variable.projectName}.${stage}`;

  return [
    secret(`${namespace}.database.role.crud.password`),
    secret(`${namespace}.database.role.cicd.for-plan.password`),
    secret(`${namespace}.database.role.cicd.for-apply.password`),
  ];
};
