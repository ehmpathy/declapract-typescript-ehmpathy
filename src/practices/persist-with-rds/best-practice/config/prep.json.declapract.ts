import { genRdsConfigDeclaration } from '../../../../utils/genRdsConfigDeclaration';

/**
 * .what = the contents, check, and fix that deep-merge the rds keys into config/prep.json.
 * .why  = a deep merge adds the absent rds keys and keeps the leaves a repo holds on purpose, so an
 *         apply never clobbers a value a service tuned (#638, #683); see genRdsConfigDeclaration.
 */
export const { contents, check, fix } = genRdsConfigDeclaration({
  env: 'prep',
  templatePath: `${__dirname}/prep.json`,
});
