import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';
import { getModuleExportsFromTsSource } from '../../utils/getModuleExportsFromTsSource';

/**
 * .what = clamps that the provision wish declares each db credential at the exact ssm name that
 *         config's bare `$.at(aws::param)` placeholder derives: `/{org}/{project}/{config}/{keyPath}`.
 * .why  = sdk-config >= 0.3.0 derives a bare placeholder's ssm name as
 *         `/${org}/${repo}/${choice}/${keyPath}`, where `choice` is the CONFIG slug. config/*.json
 *         ships the bare form for all three passwords, so the wish must declare those same three
 *         names, or the provision manages params the app never reads while the app reads params no
 *         wish declares (#637). this supersedes the #591 clamp, which pinned the slash cicd form
 *         with no config segment; the plan role's iam pin now allows the derived form (seed S4).
 * .teeth = restore any dotted, config-segment-free, or access-keyed name in resources.parameters.ts,
 *          or drop a bare placeholder from config/prep.json, and the names-equal-config case reddens.
 *          read the config segment from `access` in place of `config` and the ACCESS=prep
 *          CONFIG=prod case reddens.
 * .note = INTEGRATION by rule.forbid.unit.remote-boundaries: it reads template files off disk. the
 *         template imports declastruct-aws + sdk-environment, which this repo does not install, so
 *         it is transpiled and run against a require stub — the clamp reads what the real source
 *         returns, never a text fragment.
 */

const paramsPath = join(
  __dirname,
  'best-practice/provision/aws/resources.parameters.ts',
);
const configPath = (env: string) =>
  join(__dirname, `best-practice/config/${env}.json`);

const ORG = '@declapract{variable.organizationName}';
const PROJECT = '@declapract{variable.projectName}';

/**
 * .what = transpile resources.parameters.ts and run getAllParameters under a stubbed environment
 * .why  = the wish reads `getEnvironment.static()` at module load; a stub per (access, config) pair
 *         proves which axis names the config segment and which tags it
 */
const runGetAllParameters = (input: {
  src: string;
  access: string;
  config: string;
}): { name: string; tags: Record<string, string> }[] => {
  const requireStub = (id: string): unknown => {
    if (id === 'declastruct-aws')
      return { DeclaredAwsSsmParameterSecure: { as: (x: unknown) => x } };
    if (id === 'sdk-environment')
      return {
        getEnvironment: {
          static: () => ({ access: input.access, config: input.config }),
        },
      };
    throw new Error(`unexpected require in template: ${id}`);
  };
  const { getAllParameters } = getModuleExportsFromTsSource<{
    getAllParameters: (input: {
      choice: string | null;
    }) => { name: string; tags: Record<string, string> }[];
  }>({ source: input.src, requireStub });
  return getAllParameters!({ choice: null });
};

/**
 * .what = list the dotted key paths whose value is the bare `$.at(aws::param)` placeholder
 * .why  = each such leaf is a param sdk-config derives a name for, so the wish owes a declaration
 */
const getAllBareParamKeyPaths = (input: {
  value: unknown;
  prefix: string[];
}): string[] => {
  if (input.value === '$.at(aws::param)') return [input.prefix.join('.')];
  if (!input.value || typeof input.value !== 'object') return [];
  return Object.entries(input.value as Record<string, unknown>).flatMap(
    ([key, child]) =>
      getAllBareParamKeyPaths({ value: child, prefix: [...input.prefix, key] }),
  );
};

describe('persist-with-rds ssm param names are the sdk-config derived names (#637)', () => {
  const scene = useBeforeAll(() => ({
    src: readFileSync(paramsPath, 'utf8'),
    prep: JSON.parse(readFileSync(configPath('prep'), 'utf8')),
    prod: JSON.parse(readFileSync(configPath('prod'), 'utf8')),
  }));

  given('[case1] the wish run with ACCESS=prep CONFIG=prep', () => {
    when('[t0] getAllParameters is called with no choice override', () => {
      const run = useBeforeAll(() => ({
        params: runGetAllParameters({ src: scene.src, access: 'prep', config: 'prep' }),
      }));

      then('it declares the three derived names under /{org}/{project}/prep/', () => {
        expect(run.params.map((p) => p.name)).toEqual([
          `/${ORG}/${PROJECT}/prep/database.role.crud.password`,
          `/${ORG}/${PROJECT}/prep/database.role.cicd.for-plan.password`,
          `/${ORG}/${PROJECT}/prep/database.role.cicd.for-apply.password`,
        ]);
      });

      then('the declared names equal the names config/prep.json derives', () => {
        const derived = getAllBareParamKeyPaths({ value: scene.prep, prefix: [] })
          .map((keyPath) => `/${ORG}/${PROJECT}/prep/${keyPath}`)
          .sort();
        expect(run.params.map((p) => p.name).sort()).toEqual(derived);
      });

      then('no name carries the legacy `dev` slug or a dotted org.project namespace', () => {
        for (const { name } of run.params) {
          expect(name).not.toContain('/dev/');
          expect(name).not.toContain(`${ORG}.${PROJECT}`);
        }
      });

      then('the declared names match snapshot', () => {
        expect(run.params.map((p) => p.name)).toMatchSnapshot();
      });
    });
  });

  given('[case2] the wish run with ACCESS=prod CONFIG=prod', () => {
    when('[t0] getAllParameters is called', () => {
      then('the declared names equal the names config/prod.json derives', () => {
        const params = runGetAllParameters({
          src: scene.src,
          access: 'prod',
          config: 'prod',
        });
        const derived = getAllBareParamKeyPaths({ value: scene.prod, prefix: [] })
          .map((keyPath) => `/${ORG}/${PROJECT}/prod/${keyPath}`)
          .sort();
        expect(params.map((p) => p.name).sort()).toEqual(derived);
      });
    });
  });

  given('[case3] the wish run with ACCESS=prep CONFIG=prod (a legal pair)', () => {
    when('[t0] getAllParameters is called', () => {
      const run = useBeforeAll(() => ({
        params: runGetAllParameters({ src: scene.src, access: 'prep', config: 'prod' }),
      }));

      then('the config slug names the config segment, so the names read prod', () => {
        expect(run.params).toHaveLength(3);
        for (const { name } of run.params) expect(name).toContain(`/${PROJECT}/prod/`);
      });

      then('the access tags each param', () => {
        for (const { tags } of run.params) expect(tags.environment).toEqual('prep');
      });
    });
  });
});
