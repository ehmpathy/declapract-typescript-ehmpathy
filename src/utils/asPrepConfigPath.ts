/**
 * .what = relocate a `config/dev.json` relativeFilePath to `config/prep.json`.
 * .why  = ONE source for the relocate half of the two `old-dev-config-location` declarers
 *         (config + persist-with-rds), paired with `migrateDevConfigToPrep` (the content half).
 *         the relocate regex was duplicated verbatim in both declarers' fix bodies; a future
 *         edit to the target filename (e.g. `config/prep/`) must touch one place now, never
 *         two that drift. mirrors `defineExpectedGitignoreContents` / `migrateDevConfigToPrep`.
 */
export const asPrepConfigPath = (input: {
  relativeFilePath: string;
}): string =>
  input.relativeFilePath.replace(/^config\/dev\.json$/, 'config/prep.json');
