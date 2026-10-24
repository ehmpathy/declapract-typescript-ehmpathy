# F13: the adopter journeys are proven at the declapract integration grain, not by a new acceptance suite

- fork: prove the five adopter journeys in `*.declapract.integration.test.ts` files, as this repo proves every
  practice · stand up a first `*.acceptance.test.ts` suite for this one practice change
- found: this repo ships practices, not a cli, api, or sdk. it holds zero acceptance tests
  (`rhx globsafe --pattern 'src/**/*.acceptance.test.ts'` → 0 files) and no acceptance runner in its ci. its own rule
  `rule.require.declapract-integration-tests` names the declapract integration test as the grain that proves a
  practice: it drives `executeApply` against a real temp repo and snaps the before/after of each file it writes
- taken: the integration grain. each journey already runs end to end there, with real installs under the pinned
  pnpm and the shipped dpdm check, and now snaps its adopter-visible output: the applied `package.json` (whole file),
  the pnpm patch lines (fit `[]` × 24 and misfit warn), and the `test:lint:cycles` verdict, green and red. a new
  acceptance tier for one pr would be a second test grain this repo does not run, laid beside the one it does
- the adopter's own cli path is walked by hand through the compiled `dist/` (`rhx declapract.walk`), which now runs
  the emitted cycle check as well
- rework: clean — the integration scenes are self-contained; a later acceptance tier could wrap the same scenes
- confidence: 85%. a reviewer may hold that any adopter journey owes the acceptance suffix
- where: `src/practices/persist-with-rds/pg-pool-patch.declapract.integration.test.ts`,
  `src/practices/pnpm/stale-patched-dependency.declapract.integration.test.ts`
- verdict: settled by the director, as taken: no acceptance suite. this repo proves practices via declapract
  integration tests and holds no `.acceptance.test.ts`; a first acceptance harness is a behavior of its own, not a
  rider on this pr
