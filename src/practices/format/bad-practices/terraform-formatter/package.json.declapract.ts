import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asPackageJSON } from '../../../../utils/asPackageJSON';

/**
 * .what = the two terraform formatter commands `terraform-common` once shipped into package.json
 * .why  = format is biome only (#645). `terraform fmt` needs a host binary that no practice
 *         declares, so `npm run test:format` failed on every box without terraform. the format
 *         best-practice is a CONTAINS json check: its fix rewrites the `fix:format` / `test:format`
 *         chains to biome only, but never deletes a key. this bad-practice deletes the two keys.
 * .note = lives in `format`, not `terraform-common`: format is core and stays, so it still cleans
 *         an adopter that upgrades after terraform-common is gone.
 */
const TERRAFORM_FORMAT_KEYS = ['fix:format:terraform', 'test:format:terraform'];
const PRACTICE = 'format/terraform-formatter';

export const check: FileCheckFunction = (contents) => {
  if (!contents)
    throw new Error(
      `does not match bad practice: [${PRACTICE}] package.json has no contents`,
    );

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  const scripts: Record<string, unknown> = packageJSON.scripts ?? {};
  if (TERRAFORM_FORMAT_KEYS.some((key) => key in scripts)) return; // detected

  throw new Error(
    `does not match bad practice: [${PRACTICE}] no terraform formatter command in scripts`,
  );
};

/**
 * .what = the package.json without the two terraform formatter commands; all other keys keep
 *         their order and value
 */
const withoutTerraformFormatKeys = (input: {
  packageJSON: Record<string, any>;
}): Record<string, any> => {
  const scripts = { ...input.packageJSON.scripts };
  TERRAFORM_FORMAT_KEYS.forEach((key) => {
    delete scripts[key];
  });
  return { ...input.packageJSON, scripts };
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents };

  const packageJSON = asPackageJSON({ contents }, { practice: PRACTICE });
  return {
    contents: JSON.stringify(
      withoutTerraformFormatKeys({ packageJSON }),
      null,
      2,
    ),
  };
};
