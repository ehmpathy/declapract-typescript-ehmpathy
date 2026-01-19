#!/usr/bin/env node

/**
 * .what = cli entrypoint for git-merge-packagejson
 * .why = invoked by git as a merge driver
 *
 * usage:
 *   git-merge-packagejson %O %A %B %P
 *   git-merge-packagejson --install
 *
 * args:
 *   %O = base version path
 *   %A = ours version path (result written here)
 *   %B = theirs version path
 *   %P = pathname of the file
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { merge } = require('../dist/contract/commands/merge');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { install } = require('../dist/contract/commands/install');

const args = process.argv.slice(2);

// check for --install flag
if (args[0] === '--install') {
  const exitCode = install();
  process.exit(exitCode);
}

// expect 4 args: %O %A %B %P
if (args.length !== 4) {
  console.error('usage: git-merge-packagejson <base> <ours> <theirs> <pathname>');
  console.error('   or: git-merge-packagejson --install');
  process.exit(129);
}

const [basePath, oursPath, theirsPath, pathname] = args;

const exitCode = merge({
  basePath,
  oursPath,
  theirsPath,
  pathname,
});

process.exit(exitCode);
