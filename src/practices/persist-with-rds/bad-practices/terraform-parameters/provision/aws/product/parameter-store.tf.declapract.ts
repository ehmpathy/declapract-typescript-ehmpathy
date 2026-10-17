import { type FileCheckFunction, type FileFixFunction } from 'declapract';

/**
 * .what = terraform must not manage ssm parameters — they belong to declastruct-aws
 *   now (provision/aws/resources.parameters.ts).
 * .why = terraform managed these via the `__IGNORED__` + `ignore_changes = [value]`
 *   workaround, which hid drift and forced the secret through terraform state. the
 *   real values live ONLY in aws (seeded once), so a plain resource-block delete
 *   would issue DeleteParameter = permanent loss. the fix instead rewrites each
 *   `resource "aws_ssm_parameter"` into a `removed{}` forget block (`destroy = false`)
 *   — terraform drops it from state and preserves the live value. requires terraform
 *   >= 1.7 for the `removed{}` block.
 *
 * .pair = this bad-practice removes terraform's ownership; the best-practice
 *   provision/aws/resources.parameters.ts declares the declastruct owner (value-less
 *   write-only KEEP — it adopts the live values terraform seeded). declare the wish
 *   BEFORE this forget lands so declastruct owns every param first.
 */

// bad practice detected while terraform still declares an ssm parameter resource.
export const check: FileCheckFunction = (contents) => {
  if (contents?.includes('resource "aws_ssm_parameter"')) return; // detected
  throw new Error(
    'no terraform-managed ssm parameter resources; not the terraform-parameters bad practice',
  );
};

/**
 * .what = the derived ssm names a legacy role param's value seeds, or [] for any other param
 * .why = the role rename (admin → cicd for-plan + for-apply, service → crud) moved the values to
 *        new names; the forget erases the last terraform trace of the old one, so its comment
 *        names where the value must be copied (#686). a fix holds no aws access, so the copy
 *        itself is a human step (provision/aws/readme.md).
 */
const getAllCopyTargetsForLabel = (input: {
  label: string;
  namespace: string;
}): string[] => {
  if (/(^|_)admin(_|$)/.test(input.label))
    return [
      `${input.namespace}/database.role.cicd.for-plan.password`,
      `${input.namespace}/database.role.cicd.for-apply.password`,
    ];
  if (/(^|_)service(_|$)/.test(input.label))
    return [`${input.namespace}/database.role.crud.password`];
  return [];
};

/**
 * .what = cast copy targets into the comment line above a forget block ([] when none)
 */
const asCopyNoteLines = (input: { targets: string[] }): string[] =>
  input.targets.length
    ? [
        `# copy this value before the first plan → ${input.targets.join(', ')} (see provision/aws/readme.md)`,
      ]
    : [];

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return {};

  // the derived namespace each copy target sits under; the config segment differs per env, so it stays `{config}`
  const org = context?.projectVariables?.organizationName ?? '{org}';
  const project = context?.projectVariables?.projectName ?? '{project}';
  const namespace = `/${org}/${project}/{config}`;

  // drop the `data "aws_ssm_parameter"` reads — they existed only to seed values
  // that declastruct-aws now owns.
  const withoutDataReads = contents.replace(
    /data\s+"aws_ssm_parameter"\s+"\w+"\s*\{[\s\S]*?\n\}\n?/g,
    '',
  );

  // rewrite each `resource "aws_ssm_parameter" "<label>" { ... }` into a forget
  // block. `[\s\S]*?\n\}` stops at the first column-0 `}` (the block close); the
  // indented `  }` of a nested lifecycle block never matches, so the nest is safe.
  const withForgetBlocks = withoutDataReads.replace(
    /resource\s+"aws_ssm_parameter"\s+"(\w+)"\s*\{[\s\S]*?\n\}/g,
    (_match, label: string) =>
      [
        ...asCopyNoteLines({
          targets: getAllCopyTargetsForLabel({ label, namespace }),
        }),
        `removed {`,
        `  from = aws_ssm_parameter.${label}`,
        `  lifecycle {`,
        `    destroy = false # forget from state; keep the live param`,
        `  }`,
        `}`,
      ].join('\n'),
  );

  return { contents: withForgetBlocks };
};
