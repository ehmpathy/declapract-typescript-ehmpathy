import { type FileCheckFunction, type FileFixFunction } from 'declapract';

/**
 * .what = terraform must not manage SSM parameters — they belong to declastruct-aws
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

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};

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
    (_match, label) =>
      [
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
