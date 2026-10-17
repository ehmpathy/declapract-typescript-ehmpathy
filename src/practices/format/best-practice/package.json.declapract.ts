import { FileCheckType } from 'declapract';

/**
 * .what = the `fix:format` / `test:format` commands must be present, biome only.
 * .why  = biome is the one formatter (#645). a chain that also ran `terraform fmt` needed a host
 *         binary no practice declares, so it failed on every box without terraform. the json
 *         CONTAINS fix rewrites a stale chain in place; `bad-practices/terraform-formatter`
 *         deletes the old terraform sub-command keys.
 */
export const check = FileCheckType.CONTAINS;
