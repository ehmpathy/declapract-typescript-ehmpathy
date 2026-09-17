import autopruneSetup from 'test-fns/autoprune.setup.jest';

import { useWakeOfLivedb } from './src/.test/useWakeOfLivedb';

/**
 * .what = jest globalSetup for the acceptance suite — runs once, in the main process, before
 *         jest forks its workers.
 * .why =
 *   - COMPOSES two setups that both need this one hook: the livedb wake (resume the shared
 *     aurora-serverless cluster so the first query does not cold-start past the timeout) and
 *     test-fns autoprune (mint this run's id BEFORE the first fork, so genTempDir dirs are
 *     reclaimed). jest allows ONE globalSetup, so a service that needs both must compose them
 *     here rather than pick one — a bare `globalSetup: 'test-fns/autoprune.setup.jest'` (the
 *     shipped default) leaves the db un-woken, and a bare wake setup drops autoprune (every dir
 *     stamped, none reclaimed — the #590 half-wired state).
 *   - the acceptance suites invoke deployed lambdas that proxy to peers which query the shared
 *     cluster; a paused cluster cold-starts past the timeout and flakes the quote suites. wake
 *     it once here (not per-file — env setup runs per worker), so the first real query lands warm.
 *   - the wake runs FIRST (best-effort, self-gated on a declared db tunnel — a no-op for a
 *     service that reaches no cluster), THEN autoprune mints the run id.
 *   - `globalConfig` is FORWARDED to autoprune unchanged: test-fns reads its `globalTeardown`
 *     slot to detect the half-wired state, and a dropped/defaulted arg would falsely accuse a
 *     correctly-wired consumer (see test-fns autoprune.setup.jest .note).
 * .note = `useWakeOfLivedb` is imported by RELATIVE path, never the `@src` alias — a globalSetup is
 *         loaded by node's plain require BEFORE jest's moduleNameMapper exists, so `@src` here
 *         fails with `Cannot find module` and kills the run at startup (the same trap test-fns'
 *         own autoprune.setup.jest documents).
 */
// biome-ignore lint/style/noDefaultExport: jest globalSetup api requires default export
export default async (globalConfig: { globalTeardown?: string | null }): Promise<void> => {
  // the wake TARGET is always the prep cluster: a test-access AND a prep-access suite both fan out
  // to the shared prep peer fleet (define.invariant.test-and-prep-reach-prep-peers), so 'prep' is
  // the one cluster either access reaches; only prod is self-contained and never woken.
  await useWakeOfLivedb({ env: 'prep' });
  await autopruneSetup(globalConfig);
};
