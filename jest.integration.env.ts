import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { ConstraintError } from 'helpful-errors';
import { join } from 'path';
import util from 'util';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // since we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new ConstraintError('no package.json found in cwd. are you @gitroot?', {
    cwd: process.cwd(),
  });

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' ||
    (process.env.ACCESS && process.env.ACCESS !== 'test')) &&
  process.env.I_KNOW_WHAT_IM_DOING !== 'true'
)
  throw new ConstraintError(
    `integration.test must run against access 'test' — set NODE_ENV=test and unset ACCESS (or I_KNOW_WHAT_IM_DOING=true to override)`,
    {
      nodeEnv: process.env.NODE_ENV ?? null,
      access: process.env.ACCESS ?? null,
    },
  );

/**
 * .what = verify that the env has sufficient auth to run the tests if aws is used; otherwise, fail fast
 * .why =
 *   - prevent time wasted waiting on tests to fail due to lack of credentials
 *   - prevent time wasted debugging tests which are failing due to hard-to-read missed credential errors
 */
const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
const declapractUseContent = existsSync(declapractUsePath)
  ? readFileSync(declapractUsePath, 'utf8')
  : '';
const requiresAwsAuth = declapractUseContent.includes('awsAccountId');
if (
  requiresAwsAuth &&
  !(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID)
)
  throw new ConstraintError(
    'no aws credentials present. please authenticate with aws to run integration tests',
    { awsProfile: process.env.AWS_PROFILE ?? null },
  );

/**
 * .what = verify that the testdb has been provisioned if a databaseUserName is declared
 * .why =
 *   - prevent time wasted waiting on tests to fail due to missing testdb
 *   - prevent confusing "password authentication failed" errors when testdb isn't running or was provisioned for a different repo
 */
const requiresTestDb = declapractUseContent.includes('databaseUserName');
if (requiresTestDb) {
  const testConfigPath = join(process.cwd(), 'config', 'test.json');
  if (!existsSync(testConfigPath))
    throw new ConstraintError(
      'config/test.json not found but serviceUser is declared in declapract.use.yml',
      { testConfigPath },
    );
  const testConfig = JSON.parse(readFileSync(testConfigPath, 'utf8'));
  if (
    !testConfig.database?.tunnel?.local ||
    !testConfig.database?.role?.crud ||
    !testConfig.database?.target?.database
  )
    throw new ConstraintError(
      'config/test.json database.tunnel.local, database?.role?.crud, or database?.target?.database not found but expected',
      { testConfigPath },
    );
  // preflight the testdb. PGPASSWORD rides in `env`, never the args (node puts the failed command
  // verbatim onto the thrown error's message). stderr is piped so psql's own words reach the human,
  // rather than collapse every cause into one hardcoded guess (rule.forbid.failhide).
  try {
    execFileSync(
      'psql',
      [
        '-h',
        String(testConfig.database.tunnel.local.host),
        '-p',
        String(testConfig.database.tunnel.local.port),
        '-U',
        testConfig.database.role.crud.username,
        '-d',
        testConfig.database.target.database,
        '-c',
        'SELECT 1',
      ],
      {
        timeout: 3000,
        stdio: ['ignore', 'ignore', 'pipe'],
        env: {
          ...process.env,
          PGPASSWORD: testConfig.database.role.crud.password,
        },
      },
    );
  } catch (error) {
    const said =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr?: Buffer }).stderr ?? '').trim()
        : '';
    throw new ConstraintError(
      [
        `cant connect to the testdb at ${testConfig.database.tunnel.local.host}:${testConfig.database.tunnel.local.port}`,
        '',
        'psql said:',
        `  ${said || '(no stderr -- psql may be absent from PATH, or the call timed out)'}`,
        '',
        'fix: run `npm run start:testdb`',
      ].join('\n'),
      {
        host: testConfig.database.tunnel.local.host,
        port: testConfig.database.tunnel.local.port,
        psqlSaid: said || null,
      },
    );
  }
}
