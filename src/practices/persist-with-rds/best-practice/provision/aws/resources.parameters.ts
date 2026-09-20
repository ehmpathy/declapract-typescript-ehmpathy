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
 * .what = the access as it is SPELLED in the live SSM param NAMES — a legacy slug.
 * .why = terraform seeded these params under var.environment, where the prep account carried the
 *        legacy `dev` slug (see define.infrastructure-dev-vs-application-prep). the live param
 *        names contain that literal string, so the dotted namespace casts prep→dev. test/prod are
 *        unchanged. (tags do NOT cast — they conform to the access vocab; see `secret` below.)
 * .note = this is NOT the lambda-fleet slug bridge `sdkAwsLambdaEnvAccessAncient`, which collapses
 *        BOTH test and prep to `dev`. here test keeps its own name, because this casts a literal
 *        legacy SSM param string, not a fleet slug — a deliberately narrower cast, not a drifted copy.
 */
const accessSlug = access === 'prep' ? 'dev' : access;

/**
 * .what = declare a secret ssm parameter for adoption (write-only, default key).
 * .why = every param here is a secret whose value already lives in aws; we supply no `value` so
 *        plan KEEPs the extant value and never reads or rewrites it. keyId=null selects the
 *        account default aws/ssm key (what terraform used, no kms_key_id). tags conform to the
 *        org access vocab (`prep`, not the legacy `dev`), so the first apply reconciles the live
 *        `environment` tag from dev→prep (a metadata-only change, no value write).
 */
const secret = (input: { name: string }): DeclaredAwsSsmParameterSecure =>
  DeclaredAwsSsmParameterSecure.as({
    name: input.name,
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
 * .why = the db-role credentials the service + migrations use. declared for every access —
 *        no per-tier conditional. only prep + prod ever APPLY this wish (there is no
 *        aws-test-declastruct provision job — see .github/workflows/provision.yml), so the
 *        value-less-absent throw on apply cannot trigger in test. test sources its non-sensitive
 *        db creds straight from config/test.json and never reconciles these params.
 * .note = the two cicd credentials are pinned in the prod plan role's iam policy as SLASH paths
 *         with NO tier segment — `parameter/<star>/svc-<star>/database/role/cicd/for-plan/<star>`
 *         and `.../for-apply/<star>`. that pin's arn needs literal `/` separators after
 *         `parameter/`, so a dotted name cannot match it and the plan role gets ciphertext or a
 *         denial, forever. it omits a tier segment on purpose: the aws ACCOUNT separates prep
 *         from prod, never the name. so the for-plan name MUST stay byte-identical to the pin.
 *         the crud credential is pinned by NO policy, so it keeps the dotted
 *         `${org}.${project}.${accessSlug}` name that config/${env}.json matches — hence the
 *         three names differ in shape by design, not by accident.
 * .note = `<star>` stands in for the literal `*` wildcard of that arn, and must stay a stand-in.
 *         a literal `*` written immediately before a `/` closes this comment mid-prose, so every
 *         character after it is read as code and the file no longer parses — which breaks
 *         `pnpm fix` in every repo that adopts this template, with no repair available to them
 *         (declapract apply restores these bytes). see #613.
 */
export const getAllParameters = (input: {
  accessSlug: string | null;
}): DeclaredAwsSsmParameterSecure[] => {
  // dotted namespace that prefixes the env-scoped crud param name
  // keep in sync with terraform local.parameter_store_namespace + config/${env}.json
  const slug = input.accessSlug ?? accessSlug;
  const namespace = `@declapract{variable.organizationName}.@declapract{variable.projectName}.${slug}`;

  return [
    // crud: dotted + tier-scoped, matched by config/${env}.json; no policy pins it
    secret({ name: `${namespace}.database.role.crud.password` }),
    // cicd: SLASH path, NO tier segment — byte-identical to the prod plan role's iam pin
    secret({
      name: `/@declapract{variable.organizationName}/@declapract{variable.projectName}/database/role/cicd/for-plan/password`,
    }),
    secret({
      name: `/@declapract{variable.organizationName}/@declapract{variable.projectName}/database/role/cicd/for-apply/password`,
    }),
  ];
};
