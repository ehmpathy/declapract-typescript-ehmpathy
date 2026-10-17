import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { DYNAMODB_INSERTS as JEST_INSERTS } from '../tests-node/best-practice/jest.integration.env.ts.declapract';
import { DYNAMODB_INSERTS as TF_INSERTS } from '../terraform-aws/best-practice/provision/aws/environments/test/main.tf.declapract';

/**
 * .what = end-to-end proof that a persist-with-dynamodb service still gets its local dynamodb
 *         endpoint, now that tests-node and terraform-aws are the one owner of each file (#630)
 * .why  = persist-with-dynamodb once redeclared `jest.integration.env.ts` and the test `main.tf`
 *         beside their owners. the two declarations fought, so each apply left one file manual or
 *         rewrote it. the dynamodb delta now rides on each owner as a usecase-aware findsert insert;
 *         this clamp proves the REAL apply pipeline delivers it, keeps it under a narrow scope, and
 *         converges on a second apply.
 * .teeth = swap `'persist-with-dynamodb'` in `jest.integration.env.ts.declapract.ts` for any other
 *          name and case1 reddens: the env is written without the endpoint line.
 * .note = applies scope by `file` only, never `practice`: a `practice` filter makes
 *         `projectPractices` hold just that practice, so the dynamodb branch would go dark
 *         (rule.require.declapract-integration-tests, gotchas).
 * .note = the fixture declares a local three-practice usecase (the two owners plus
 *         persist-with-dynamodb), so a `file`-scoped apply evaluates three practices, not dozens.
 */
// a `file`-scoped apply evaluates every practice of the usecase, so one apply can outlast the
// default 90s under a busy host
jest.setTimeout(15 * 60 * 1000);

const FIXTURE =
  './src/practices/persist-with-dynamodb/.test/assets/demo-repo-with-dynamodb';
const JEST_ENV = 'jest.integration.env.ts';
const TF_TEST = 'provision/aws/environments/test/main.tf';
const ENDPOINT_LINE =
  "process.env.USE_CUSTOM_DYNAMODB_ENDPOINT = 'http://localhost:7337';";
const TEMPLATE_JEST_ENV = path.join(
  __dirname,
  '../tests-node/best-practice',
  JEST_ENV,
);

const genRepo = (slug: string) =>
  genTempDir({ slug, clone: FIXTURE, symlink: [{ at: 'declarations', to: 'src' }] });
const read = (root: string, rel: string) =>
  fs.readFile(path.join(root, rel), 'utf-8');
const apply = (root: string, input: { file: string; practice?: string }) =>
  executeApply({ config: path.join(root, 'declapract.use.yml'), ...input });
const strip = (contents: string, inserts: { text: string }[]) =>
  inserts.reduce((text, insert) => text.split(insert.text).join(''), contents);

describe('persist-with-dynamodb — local dynamodb endpoint via the usecase-aware owners (#630)', () => {
  given('[case1] a dynamodb service with neither file yet', () => {
    const root = genRepo('declapract-dynamodb-endpoint-absent');

    when('[t0] the jest integration env is applied', () => {
      useThen('apply the env', async () => apply(root, { file: JEST_ENV }));

      then('the env sets the local dynamodb endpoint, under the test access', async () => {
        const after = await read(root, JEST_ENV);
        expect(after).toContain(ENDPOINT_LINE);
        expect(after).toContain("if (access === 'test')");
        expect(after).toContain("import { access } from './src/utils/environment';");
        expect(after).toMatchSnapshot('jest.integration.env.ts — after');
      });

      then('the rest of the env is the tests-node template, byte for byte', async () => {
        const after = await read(root, JEST_ENV);
        const template = await fs.readFile(TEMPLATE_JEST_ENV, 'utf-8');
        expect(strip(after, JEST_INSERTS)).toEqual(template);
      });
    });

    when('[t1] the test environment main.tf is applied', () => {
      useThen('apply the main.tf', async () => apply(root, { file: TF_TEST }));

      then('the aws provider points dynamodb at the local container', async () => {
        const after = await read(root, TF_TEST);
        expect(after).toContain('dynamodb = "http://localhost:7337/"');
        expect(after).toMatch(/provider "aws" \{\n {2}endpoints \{/);
        expect(after).not.toContain('@declapract{');
        expect(after).toMatchSnapshot('test/main.tf — after');
      });
    });

    when('[t2] both files are applied a second time (idempotency)', () => {
      const passes = useThen('a second apply over its own output', async () => {
        const before = {
          env: await read(root, JEST_ENV),
          tf: await read(root, TF_TEST),
        };
        await apply(root, { file: JEST_ENV });
        await apply(root, { file: TF_TEST });
        return {
          before,
          after: { env: await read(root, JEST_ENV), tf: await read(root, TF_TEST) },
        };
      });

      then('the second apply is a no-op', () => {
        expect(passes.after).toEqual(passes.before);
      });
    });
  });

  given('[case2] a dynamodb service whose env is the plain tests-node template', () => {
    const root = genRepo('declapract-dynamodb-endpoint-union');
    const scene = useBeforeAll(async () => {
      const template = await fs.readFile(TEMPLATE_JEST_ENV, 'utf-8');
      await fs.writeFile(path.join(root, JEST_ENV), template);
      return { template };
    });

    when('[t0] the env is applied', () => {
      useThen('apply the env', async () => apply(root, { file: JEST_ENV }));

      then('the endpoint is unioned in and the base stays intact', async () => {
        const after = await read(root, JEST_ENV);
        expect(scene.template).not.toContain(ENDPOINT_LINE);
        expect(after).toContain(ENDPOINT_LINE);
        expect(strip(after, JEST_INSERTS)).toEqual(scene.template);
      });
    });

    when('[t1] a narrow apply scoped to tests-node alone runs over it', () => {
      const passes = useThen('a narrow-scope apply', async () => {
        const before = await read(root, JEST_ENV);
        await apply(root, { file: JEST_ENV, practice: 'tests-node' });
        return { before, after: await read(root, JEST_ENV) };
      });

      then('the dynamodb lines are kept, never stripped', () => {
        expect(passes.after).toContain(ENDPOINT_LINE);
        expect(passes.after).toEqual(passes.before);
      });
    });
  });

  given('[case4] a dynamodb service whose endpoint line drifted to another port', () => {
    // the drift the prior owner repaired: the base strips clean only with the canonical insert,
    // so a drifted endpoint makes the base differ, and the findsert rewrites from the template
    const root = genRepo('declapract-dynamodb-endpoint-drift');
    const scene = useBeforeAll(async () => {
      const template = await fs.readFile(TEMPLATE_JEST_ENV, 'utf-8');
      const canonical = JEST_INSERTS.reduce((text, insert) => {
        const end = text.indexOf(insert.after) + insert.after.length;
        return `${text.slice(0, end)}${insert.text}${text.slice(end)}`;
      }, template);
      const before = canonical.replace('localhost:7337', 'localhost:9999');
      await fs.writeFile(path.join(root, JEST_ENV), before);
      return { template, before };
    });

    when('[t0] the env is applied', () => {
      const result = useThen('apply the env', async () => {
        await apply(root, { file: JEST_ENV });
        return { after: await read(root, JEST_ENV) };
      });

      then('the drifted port is repaired to the local container', () => {
        expect(scene.before).toContain('localhost:9999');
        expect(result.after).not.toContain('9999');
        expect(result.after).toContain(ENDPOINT_LINE);
      });

      then('the rest of the env is the tests-node template, byte for byte', () => {
        expect(strip(result.after, JEST_INSERTS)).toEqual(scene.template);
      });

      then('before + after match snapshot', () => {
        expect(scene.before).toMatchSnapshot('jest.integration.env.ts — drifted, before');
        expect(result.after).toMatchSnapshot('jest.integration.env.ts — drifted, after');
      });
    });
  });

  given('[case3] the terraform insert, against its own declaration', () => {
    then('the insert sits inside the aws provider block', () => {
      expect(TF_INSERTS[0]!.after).toEqual('provider "aws" {');
    });
  });
});
