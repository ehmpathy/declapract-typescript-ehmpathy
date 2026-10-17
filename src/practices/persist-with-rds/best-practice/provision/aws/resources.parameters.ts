import { DeclaredAwsSsmParameterSecure } from 'declastruct-aws';
import { getEnvironment } from 'sdk-environment';

/**
 * .what = the secret ssm parameters this service manages via declastruct.
 * .why = declastruct-aws owns them, off terraform (provision/aws/product/parameter-store.tf is a
 *        forget). each is a write-only DeclaredAwsSsmParameterSecure: plan reads metadata only and
 *        never the value.
 * .note = no `value` is supplied: plan KEEPs an extant param and never rewrites it. a value-less
 *         param that is ABSENT throws on apply (declastruct-aws setSsmParameterSecure). only prep
 *         and prod apply this wish, so test never meets that throw.
 * .scope = the db-role credentials only. a service declares its own other secrets beside these.
 */

/**
 * .what = the environment this wish runs in.
 * .why = `config` NAMES each param (the segment sdk-config derives); `access` TAGS it. the two may
 *        differ (ACCESS=prep CONFIG=prod is legal), and the app reads the params of its config.
 */
const { access, config } = getEnvironment.static();

/**
 * .what = declare a secret ssm parameter for adoption (write-only, default key).
 * .why = the value already lives in aws, so plan KEEPs it and never reads or rewrites it.
 *        keyId=null selects the account default aws/ssm key.
 */
const secret = (input: { name: string }): DeclaredAwsSsmParameterSecure =>
  DeclaredAwsSsmParameterSecure.as({
    name: input.name,
    keyId: null, // default aws/ssm key
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
 * .why = each name is the one sdk-config derives for a bare `$.at(aws::param)` placeholder in
 *        config/{env}.json: `/{org}/{project}/{config}/{keyPath}`. the provision declares exactly
 *        the names the app reads.
 * .note = @declapract:review — a param whose value still sits only at a prior name has no value
 *         here, and its first apply throws at the absent param. copy each value to its derived
 *         name first (see provision/aws/readme.md, "copy params to the derived names").
 */
export const getAllParameters = (input: {
  choice: string | null;
}): DeclaredAwsSsmParameterSecure[] => {
  // the derived namespace: org, project, then the config slug as the segment
  const namespace = `/@declapract{variable.organizationName}/@declapract{variable.projectName}/${input.choice ?? config}`;

  return [
    secret({ name: `${namespace}/database.role.crud.password` }),
    secret({ name: `${namespace}/database.role.cicd.for-plan.password` }),
    secret({ name: `${namespace}/database.role.cicd.for-apply.password` }),
  ];
};
