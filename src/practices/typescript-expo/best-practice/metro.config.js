const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;

// >>> declapract: metro cache keyed on ACCESS + app config
// a transform cached under one access never serves a build for another, while a rebuild with the
// same access and app config stays warm. keep this block last, after the final module.exports.
{
  const crypto = require('node:crypto');
  const { getConfig } = require('expo/config');
  const metroConfig = module.exports;
  if (!metroConfig || typeof metroConfig !== 'object')
    throw new Error(
      'metro.config.js must assign a config object to module.exports before the access-keyed cache block',
    );
  const access = process.env.ACCESS ?? 'unset';
  const { exp } = getConfig(__dirname, {
    skipSDKVersionRequirement: true,
    isPublicConfig: true,
  });
  const envPublic = Object.keys(process.env)
    .filter((key) => key.startsWith('EXPO_PUBLIC_'))
    .sort()
    .map((key) => [key, process.env[key]]);
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ access, exp, envPublic }))
    .digest('hex')
    .slice(0, 16);
  metroConfig.cacheVersion = [
    metroConfig.cacheVersion,
    `access=${access}`,
    `config=${hash}`,
  ]
    .filter(Boolean)
    .join('.');
}
// <<< declapract: metro cache keyed on ACCESS + app config
