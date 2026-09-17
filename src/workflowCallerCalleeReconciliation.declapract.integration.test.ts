import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

import {
  getAllPathsUnderDir,
  PRACTICE_TREE_SKIP_DIRS,
} from './utils/getAllPathsUnderDir';

/**
 * .what = the caller↔callee reconciliation guard for this repo's reusable github workflows.
 *         it walks every workflow TEMPLATE under src/practices, indexes the CALLEES (a template
 *         that declares `on.workflow_call`) by BASENAME, collects every CALLER ref (a job whose
 *         `uses: ./.github/workflows/<x>` targets a local reusable workflow), and reconciles the
 *         two contracts:
 *           (c) every caller ref resolves to a declared callee
 *           (d) a caller passes NO input the callee does not declare
 *           (e) a caller supplies EVERY input the callee marks required (and un-defaulted)
 *           (f) a caller (with explicit `secrets:`) passes no extra secret and omits no required
 *               one — a `secrets: inherit` ref skips the secret check (inherit forwards all)
 * .why  = a `uses:` call passes `with:`/`secrets:` that github validates against the callee's
 *         `on.workflow_call.inputs`/`secrets` ONLY at run time — an undeclared input errors, an
 *         absent required input errors, and no gate sees either before the workflow runs (no
 *         tsc, no formatter reads a yaml key mismatch). the svc-gateway roster is the receipt:
 *         the expo `test.yml` passed inputs+secrets the shared `.test.yml` never declared (#580),
 *         the same silent break as the caller-without-callee class (#573). this guard reconciles
 *         the INPUT/SECRET contract, so it directly clamps the D31/D52 shape; D28 (a callee FILE
 *         that must exist) and D29 (a deliberately `required:false` secret) sit outside an
 *         `inputs:`/`secrets:` reconciler's view — each is closed by its own point-test, not here.
 *         this is #573's explicitly-declared durable guard — reconcile every `uses:` against the
 *         callee's declared `inputs:`/`secrets:` — realized as a clamp.
 * .note = a caller resolves to a callee by BASENAME because a github `./.github/workflows/<x>`
 *         ref resolves within the CONSUMER repo, which receives one `<x>.yml` from whichever
 *         practice declares it for its usecase. cross-practice resolution is real and intended:
 *         the expo `.deploy-expo.yml` calls cicd-common's `.install.yml`, and expo's `test.yml`
 *         calls cicd-common's `.test.yml` (both practices co-exist in the expo usecase). so
 *         assertion (b) guards the resolution itself: if one basename maps to two callees whose
 *         contracts diverge, a basename resolution is ambiguous and every downstream check is
 *         unsound — so that is a blocker before (c)-(f) even run.
 * .note = INTEGRATION by the same rule as `actionPins` / `workflowEnvDeploymentFalse`: it walks
 *         the filesystem (`readFileSync` over every workflow template), and
 *         `rule.forbid.unit.remote-boundaries` puts any fs-crossing test in the integration
 *         suite. no credential, no network — the boundary alone classifies it.
 */

/**
 * .what = the root under which every declared workflow template lives.
 * .why  = a template is copied verbatim to a consumer, so its caller/callee contract must
 *         reconcile HERE — a consumer cannot fix it locally (the next `declapract fix` reverts a
 *         hand-edit).
 */
const PRACTICES_DIR = `${__dirname}/practices`;

const isWorkflowTemplatePath = (path: string): boolean =>
  path.includes('/.github/workflows/') && path.endsWith('.yml');

const parseWorkflow = (path: string) => yaml.parse(readFileSync(path, 'utf8'));

/**
 * .what = the `on.workflow_call` node, across the YAML `on:` gotcha — returns `{}` for a
 *         callee that declares the key with NO value (`on: workflow_call:`, a reusable
 *         workflow with no inputs/secrets), and `null` only when the key is genuinely absent.
 * .why  = under YAML 1.2 core `on:` is the string key `'on'`; a 1.1-mode parser folds it to the
 *         boolean key `true`. read both so the resolution never silently reads null. AND a
 *         `workflow_call:` with an empty value parses to `null` — that file IS still a callee
 *         (e.g. `.publish-npm.yml`), so key-presence, not value-truthiness, decides.
 */
/**
 * .what = the `on:` trigger node of a parsed workflow, across the YAML `on:` gotcha.
 * .why  = a named transformer leaf, so `getWorkflowCall` reads intent rather than an inline
 *         `parsed?.[true as unknown as string]` a reader must decipher. under YAML 1.2 core `on:`
 *         is the string key `'on'`; a 1.1-mode parser folds it to the boolean key `true`, so both
 *         reads are tried. the boolean-key access needs the object-key coercion the YAML lib forces.
 */
const asWorkflowTriggerNode = (
  parsed: ReturnType<typeof parseWorkflow>,
): unknown => parsed?.['on'] ?? parsed?.[true as unknown as string];

const getWorkflowCall = (parsed: ReturnType<typeof parseWorkflow>) => {
  const on = asWorkflowTriggerNode(parsed);
  if (!on || typeof on !== 'object' || !('workflow_call' in on)) return null;
  return (on as Record<string, unknown>).workflow_call ?? {};
};

const asKeyList = (record: unknown): string[] =>
  record && typeof record === 'object'
    ? Object.keys(record as Record<string, unknown>)
    : [];

/** .what = the keys in `needed` that are absent from `had`. */
const absentFrom = (input: { needed: string[]; had: string[] }): string[] =>
  input.needed.filter((key) => !input.had.includes(key));

const sameKeySet = (input: { a: string[]; b: string[] }): boolean =>
  input.a.length === input.b.length &&
  [...input.a].sort().join(',') === [...input.b].sort().join(',');

interface Callee {
  base: string;
  path: string;
  inputs: { all: string[]; required: string[] };
  secrets: { all: string[]; required: string[] };
}

/**
 * .what = the one callee a basename resolves to, or null when no template declares it.
 * .why  = a consumer receives exactly one `<base>.yml` for its usecase (assertion (b) already
 *         blocked a divergent two-callee basename), so the first indexed callee IS the callee.
 *         named so the reconciliation assertions read as narrative, not a map+index decode.
 */
const getOneCalleeForBase = (input: {
  base: string;
  calleesByBase: Map<string, Callee[]>;
}): Callee | null => input.calleesByBase.get(input.base)?.[0] ?? null;

const parseCallee = (path: string): Callee | null => {
  const call = getWorkflowCall(parseWorkflow(path));
  if (!call) return null;
  const inputs = call.inputs ?? {};
  const secrets = call.secrets ?? {};
  // a REQUIRED input is `required: true` AND has no `default` — a defaulted input is optional
  // to the caller, since github fills it when the caller omits it.
  const inputRequired = asKeyList(inputs).filter(
    (key) => inputs[key]?.required === true && inputs[key]?.default === undefined,
  );
  const secretRequired = asKeyList(secrets).filter(
    (key) => secrets[key]?.required === true,
  );
  return {
    base: basename(path),
    path,
    inputs: { all: asKeyList(inputs), required: inputRequired },
    secrets: { all: asKeyList(secrets), required: secretRequired },
  };
};

interface CallerRef {
  callerPath: string;
  jobName: string;
  base: string; // the resolved callee basename
  withKeys: string[];
  secretsInherit: boolean;
  secretKeys: string[];
}

const LOCAL_USES = /^\.\/\.github\/workflows\/(?<base>.+)$/;

/**
 * .what = read the local callee basename off a job's `uses:` value, or null when it is not a
 *         local reusable-workflow reference.
 * .why  = a named transformer so the composer below reads "get the callee basename" rather than
 *         an inline `match[1]!` a reader must decode by position (rule.require.named-transformers).
 *         the named `base` capture means the shape is read by name, never by array index.
 */
const asLocalCalleeBase = (uses: unknown): string | null => {
  if (typeof uses !== 'string') return null;
  return LOCAL_USES.exec(uses)?.groups?.base ?? null;
};

const parseCallerRefs = (path: string): CallerRef[] => {
  const jobs = parseWorkflow(path)?.jobs ?? {};
  return asKeyList(jobs).flatMap((jobName): CallerRef[] => {
    const job = jobs[jobName];
    const base = asLocalCalleeBase(job?.uses);
    if (base === null) return [];
    const secrets = job?.secrets;
    return [
      {
        callerPath: path,
        jobName,
        base,
        withKeys: asKeyList(job?.with),
        secretsInherit: secrets === 'inherit',
        secretKeys: secrets === 'inherit' ? [] : asKeyList(secrets),
      },
    ];
  });
};

describe('reusable workflows reconcile caller against callee (#573 · #580)', () => {
  given('every workflow template under src/practices', () => {
    const state = useBeforeAll(() => {
      const paths = getAllPathsUnderDir({
        dir: PRACTICES_DIR,
        skip: PRACTICE_TREE_SKIP_DIRS,
      }).filter(isWorkflowTemplatePath);

      const callees = paths
        .map(parseCallee)
        .filter((callee): callee is Callee => callee !== null);
      const calleesByBase = new Map<string, Callee[]>();
      for (const callee of callees) {
        const list = calleesByBase.get(callee.base) ?? [];
        list.push(callee);
        calleesByBase.set(callee.base, list);
      }

      const callerRefs = paths.flatMap(parseCallerRefs);

      return { paths, callees, calleesByBase, callerRefs };
    });

    when('the walk resolves', () => {
      then('it reaches templates, callees, and caller refs (anti-vacuity)', () => {
        expect(state.paths.length).toBeGreaterThan(0);
        expect(state.callees.length).toBeGreaterThan(0);
        expect(state.callerRefs.length).toBeGreaterThan(0);
      });

      // the guard's SPEECH is its contract: snapshot the resolved callee + caller index so a
      // reword that recomputes a structurally-different offender datum reddens a vibecheck, not
      // just the green toEqual([]) below.
      then('the resolved caller/callee contract matches snapshot', () => {
        const calleeContracts = state.callees
          .map((callee) => ({
            base: callee.base,
            inputs: [...callee.inputs.all].sort(),
            inputsRequired: [...callee.inputs.required].sort(),
            secrets: [...callee.secrets.all].sort(),
            secretsRequired: [...callee.secrets.required].sort(),
          }))
          .sort((a, b) => a.base.localeCompare(b.base));
        const callerContracts = state.callerRefs
          .map((ref) => ({
            base: ref.base,
            job: ref.jobName,
            withKeys: [...ref.withKeys].sort(),
            secretsInherit: ref.secretsInherit,
            secretKeys: [...ref.secretKeys].sort(),
          }))
          .sort((a, b) => `${a.base}.${a.job}`.localeCompare(`${b.base}.${b.job}`));
        expect({ callees: calleeContracts, callers: callerContracts }).toMatchSnapshot(
          'workflow caller/callee reconciliation contract',
        );
      });
    });

    when('a basename maps to more than one callee', () => {
      then('their declared contracts are identical (resolution is unambiguous)', () => {
        const divergent = [...state.calleesByBase.entries()]
          .filter(([, list]) => list.length > 1)
          .filter(([, list]) => {
            const [first, ...rest] = list;
            return rest.some(
              (callee) =>
                !sameKeySet({ a: callee.inputs.all, b: first!.inputs.all }) ||
                !sameKeySet({ a: callee.secrets.all, b: first!.secrets.all }),
            );
          })
          .map(([base, list]) => ({ base, paths: list.map((c) => c.path) }));
        expect(divergent).toEqual([]);
      });
    });

    when('each caller ref is reconciled against its callee', () => {
      then('every ref resolves to a declared callee', () => {
        const unresolved = state.callerRefs
          .filter((ref) => !state.calleesByBase.has(ref.base))
          .map((ref) => ({
            caller: ref.callerPath,
            job: ref.jobName,
            base: ref.base,
          }));
        expect(unresolved).toEqual([]);
      });

      then('no ref passes an input the callee does not declare', () => {
        const offenders = state.callerRefs.flatMap((ref) => {
          const callee = getOneCalleeForBase({ base: ref.base, calleesByBase: state.calleesByBase });
          if (!callee) return [];
          const extra = absentFrom({ needed: ref.withKeys, had: callee.inputs.all });
          return extra.length
            ? [{ caller: ref.callerPath, job: ref.jobName, base: ref.base, extra }]
            : [];
        });
        expect(offenders).toEqual([]);
      });

      then('every ref supplies each required, un-defaulted input', () => {
        const offenders = state.callerRefs.flatMap((ref) => {
          const callee = getOneCalleeForBase({ base: ref.base, calleesByBase: state.calleesByBase });
          if (!callee) return [];
          const unmet = absentFrom({ needed: callee.inputs.required, had: ref.withKeys });
          return unmet.length
            ? [{ caller: ref.callerPath, job: ref.jobName, base: ref.base, unmet }]
            : [];
        });
        expect(offenders).toEqual([]);
      });

      then('an explicit-secrets ref passes no extra and omits no required secret', () => {
        // a `secrets: inherit` ref forwards every secret, so it satisfies any required secret
        // and can pass no "extra" — it is skipped. only an explicit `secrets:` map is checked.
        const offenders = state.callerRefs
          .filter((ref) => !ref.secretsInherit)
          .flatMap((ref) => {
            const callee = getOneCalleeForBase({ base: ref.base, calleesByBase: state.calleesByBase });
            if (!callee) return [];
            const extra = absentFrom({ needed: ref.secretKeys, had: callee.secrets.all });
            const unmet = absentFrom({ needed: callee.secrets.required, had: ref.secretKeys });
            return extra.length || unmet.length
              ? [
                  {
                    caller: ref.callerPath,
                    job: ref.jobName,
                    base: ref.base,
                    extra,
                    unmet,
                  },
                ]
              : [];
          });
        expect(offenders).toEqual([]);
      });
    });
  });
});
