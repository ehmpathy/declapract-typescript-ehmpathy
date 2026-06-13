/**
 * .what = remove ^, ~, >=, etc. from version string for comparison
 * .why = compare base versions while the winner's original format is preserved
 */
export const stripVersionQualifier = (input: {
  version: string;
}): { base: string; original: string } => {
  const { version } = input;

  // non-semver specifiers should pass through unchanged
  if (
    version.startsWith('file:') ||
    version.startsWith('git:') ||
    version.startsWith('git+') ||
    version.startsWith('http:') ||
    version.startsWith('https:') ||
    version.startsWith('workspace:') ||
    version.startsWith('npm:') ||
    version.startsWith('link:') ||
    version === 'latest' ||
    version === 'next' ||
    version === '*'
  ) {
    return { base: version, original: version };
  }

  // strip common version range prefixes
  const prefixPattern = /^[\^~>=<]*\s*/;
  const base = version.replace(prefixPattern, '');

  return { base, original: version };
};
