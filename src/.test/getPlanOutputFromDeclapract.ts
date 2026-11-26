import { executePlan } from 'declapract';

/**
 * .what = the plan one `executePlan` prints, as lines with ansi colors cut, plus what it wrote to stderr
 * .why  = `executePlan` prints its result and returns naught, so the printed plan is the contract an
 *         adopter reads; a manual-fix notice rides stderr beside it. the log spy passes each line
 *         through to the real console, so the run log keeps the plan
 */
export const getPlanOutputFromDeclapract = async (input: {
  config: string;
}): Promise<{ lines: string[]; stderr: string }> => {
  const logOriginal = console.log;
  const spyLog = jest.spyOn(console, 'log').mockImplementation((...args) => logOriginal(...args));
  const writes: string[] = [];
  const spyErr = jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    writes.push(String(chunk));
    return true;
  });

  // each spy records every call; read them once the plan ends, before the restore clears them
  const calls = await executePlan({ config: input.config })
    .then(() => spyLog.mock.calls.map((args) => args.map(String).join(' ')))
    .finally(() => {
      spyLog.mockRestore();
      spyErr.mockRestore();
    });
  return {
    lines: calls
      .join('\n')
      .replace(/\x1b\[[0-9;]*m/g, '') // eslint-disable-line no-control-regex
      .split('\n'),
    stderr: writes.join(''),
  };
};
