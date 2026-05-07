import { execSync } from 'child_process';

/**
 * exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 129;

/**
 * .what = install git merge driver for package.json
 * .why = configure git to use this tool for package.json merge conflicts
 *
 * configures:
 * - merge.npm-packagejson-merge.name
 * - merge.npm-packagejson-merge.driver
 */
export const install = (): number => {
  try {
    // set the merge driver name
    execSync(
      'git config merge.npm-packagejson-merge.name "npm package.json merge driver"',
      { stdio: 'inherit' },
    );

    // set the merge driver command
    execSync(
      'git config merge.npm-packagejson-merge.driver "npx git-merge-packagejson %O %A %B %P"',
      { stdio: 'inherit' },
    );

    console.log('git-merge-packagejson: installed successfully');
    console.log('');
    console.log('add to your .gitattributes:');
    console.log('  package.json merge=npm-packagejson-merge');

    return EXIT_SUCCESS;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`git-merge-packagejson: install failed: ${error.message}`);
    } else {
      console.error('git-merge-packagejson: install failed: unknown error');
    }
    return EXIT_ERROR;
  }
};
