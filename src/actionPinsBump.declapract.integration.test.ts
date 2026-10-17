import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

/**
 * .what = holds this repo's OWN scheduled bump path for the sha-pinned actions (#556)
 * .why  = every workflow template here is delivered by EQUALS, so a consumer that bumps a pin by
 *         hand is reverted on its next apply. the bump must happen at the source, on a schedule,
 *         or the pins rot in place. this asserts the schedule exists, runs the bump command over
 *         both surfaces, re-records the pin table, and gates its pr on the actionPins clamp.
 * .note = the pin choice itself is unit-tested in `utils/actionPins/asActionPinTargetTag`;
 *         the shape (40-hex sha, tag tail, one sha per repo) is held by `actionPins`.
 */

const WORKFLOW_PATH = join(__dirname, '..', '.github/workflows/bump-action-pins.yml');

describe("this repo's scheduled action-pin bump (#556)", () => {
  given('[case1] the bump workflow under .github/workflows', () => {
    const scene = useBeforeAll(() => {
      const present = existsSync(WORKFLOW_PATH);
      const parsed = present ? yaml.parse(readFileSync(WORKFLOW_PATH, 'utf-8')) : null;
      const runs: string[] = Object.values(
        (parsed?.jobs ?? {}) as Record<string, { steps?: { run?: string }[] }>,
      ).flatMap((job) => (job.steps ?? []).map((step) => step.run ?? ''));
      return { present, parsed, runs };
    });

    when('[t0] it is read', () => {
      then('it exists -- if red, the pins have no bump path', () => {
        expect(scene.present).toEqual(true);
      });

      then('it runs on a schedule and on demand', () => {
        const on = scene.parsed?.on ?? scene.parsed?.[true as unknown as string] ?? {};
        expect(Object.keys(on)).toEqual(expect.arrayContaining(['schedule', 'workflow_dispatch']));
      });

      then('it runs the bump command in apply mode', () => {
        expect(scene.runs.join('\n')).toContain(
          'src/utils/actionPins/bumpActionPins.ts --mode apply',
        );
      });

      then('it re-records the pin table and holds the actionPins clamp before the pr opens', () => {
        const text = scene.runs.join('\n');
        expect(text).toContain('--testPathPatterns=actionPins');
        expect(text).toContain('RESNAP=true');
        expect(text.indexOf('actionPins')).toBeLessThan(text.indexOf('gh pr create'));
      });
    });
  });
});
