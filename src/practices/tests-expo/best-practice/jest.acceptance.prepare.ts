/// <reference path="./src/.test/assets/test-fns.autoprune.d.ts" />
import autopruneSetup from 'test-fns/autoprune.setup.jest';

import { useWakeOfLivedb } from './src/.test/useWakeOfLivedb';

/**
 * .what = jest globalSetup for the expo acceptance suite — runs once, in the main process, before
 *         jest forks its workers.
 * .why =
 *   - an expo app owns no database, but it reaches one THROUGH its gateway, whose peers query the
 *     shared aurora-serverless cluster. at min-capacity 0 that cluster auto-pauses, so the first
 *     query after a pause cold-starts past the timeout and flakes the suite.
 *   - the wake is `via-gateway`: an expo app has no `config/` dir with a db tunnel to gate on, so
 *     the test kind itself is the signal — an acceptance run reaches a deployment by construction.
 *   - an expo acceptance run may declare ACCESS=prod; the wake refuses prod, so a test run never
 *     writes capacity against production.
 *   - COMPOSES the wake with test-fns autoprune in jest's ONE globalSetup: wake FIRST (best-effort),
 *     THEN autoprune mints the run id. `globalConfig` is FORWARDED to autoprune unchanged, so its
 *     half-wired-state check reads the real `globalTeardown` slot.
 * .note = `useWakeOfLivedb` is imported by RELATIVE path, never the `@src` alias — a globalSetup is
 *         loaded BEFORE jest's moduleNameMapper exists, so `@src` here fails at startup.
 */
// biome-ignore lint/style/noDefaultExport: jest globalSetup api requires default export
export default async (globalConfig: { globalTeardown?: string | null }): Promise<void> => {
  // the wake refuses prod (prod never scales to 0); every other access wakes the prep cluster
  await useWakeOfLivedb({
    env: process.env.ACCESS === 'prod' ? 'prod' : null,
    reaches: 'via-gateway',
  });
  await autopruneSetup(globalConfig);
};
