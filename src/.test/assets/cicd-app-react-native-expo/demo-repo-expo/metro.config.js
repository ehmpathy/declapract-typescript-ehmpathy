const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// the repo's own resolver tweak, which the practice never declares
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
