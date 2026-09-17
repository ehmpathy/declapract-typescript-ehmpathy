import { ConstraintError } from 'helpful-errors';

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' || process.env.ACCESS) &&
  process.env.I_KNOW_WHAT_IM_DOING !== 'true'
)
  throw new ConstraintError(
    `unit.test must run against access 'test' — set NODE_ENV=test and unset ACCESS (or I_KNOW_WHAT_IM_DOING=true to override)`,
    {
      nodeEnv: process.env.NODE_ENV ?? null,
      access: process.env.ACCESS ?? null,
    },
  );
