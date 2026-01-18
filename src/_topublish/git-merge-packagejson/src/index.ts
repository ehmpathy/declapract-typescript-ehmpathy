/**
 * git-merge-packagejson
 *
 * a git merge driver that auto-resolves package.json dependency
 * version conflicts via semver rules.
 */

// main merge operation
export { mergePackageJson } from './domain.operations/mergePackageJson';

// leaf operations (for advanced usage)
export { compareVersions } from './domain.operations/compareVersions';
export { detectRemovalIntent } from './domain.operations/detectRemovalIntent';
export { mergeDependencySection } from './domain.operations/mergeDependencySection';
export { parsePackageJson } from './domain.operations/parsePackageJson';
export { stripVersionQualifier } from './domain.operations/stripVersionQualifier';
