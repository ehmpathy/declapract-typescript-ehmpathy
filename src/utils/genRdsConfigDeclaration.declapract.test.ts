import type { FileCheckContext } from 'declapract';
import { getError } from 'test-fns';

import { genRdsConfigDeclaration } from './genRdsConfigDeclaration';

const DECLARED = {
  database: {
    role: {
      crud: { username: 'service_user', password: '$.at(aws::param)' },
    },
    tunnel: {
      bastion: { exid: 'vpc-main-bastion' },
      cluster: { name: 'awesomesdb' },
      local: { host: 'localhost', port: 15432 },
    },
  },
};

// a documented cast: FileCheckContext carries many fields this declaration never reads; it reads
// only declaredFileContents. removal path: a declapract partial-context builder.
const contextFor = () =>
  ({
    declaredFileContents: `${JSON.stringify(DECLARED, null, 2)}\n`,
  }) as FileCheckContext;

const CASES = [
  {
    description: 'a legacy string tunnel and a repo-own key',
    env: 'prod' as const,
    found: {
      featureFlags: { surfReport: true },
      database: {
        role: { crud: { username: 'service_user', password: 'old' } },
        tunnel: {
          bastion: 'vpc-main-bastion',
          cluster: 'testdb',
          local: { host: 'localhost', port: 15432 },
        },
      },
    },
    expectKept: { path: ['featureFlags', 'surfReport'], value: true },
  },
  {
    description: 'a hand-set cluster name and the prep placeholder, with no bastion',
    env: 'prep' as const,
    found: {
      database: {
        role: {
          crud: {
            username: 'service_user',
            password: '__CHANG3_ME__',
          },
        },
        tunnel: {
          cluster: { name: 'hand-set-cluster' },
          local: { host: 'localhost', port: 15432 },
        },
      },
    },
    expectKept: {
      path: ['database', 'tunnel', 'cluster', 'name'],
      value: 'hand-set-cluster',
    },
  },
];

const getAt = (value: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
    value,
  );

describe('genRdsConfigDeclaration (#638, #683)', () => {
  CASES.forEach((thisCase) =>
    describe(thisCase.description, () => {
      const { check, fix } = genRdsConfigDeclaration({
        env: thisCase.env,
        templatePath: '/unused',
      });
      const found = `${JSON.stringify(thisCase.found, null, 2)}\n`;

      it('check flags the found config', async () => {
        const error = await getError(() => check(found, contextFor()));
        expect(error.message).toContain('differs from the declared config');
      });

      it('fix keeps the repo own value', async () => {
        const once = await fix(found, contextFor());
        expect(getAt(JSON.parse(once.contents!), thisCase.expectKept.path)).toEqual(
          thisCase.expectKept.value,
        );
      });

      it('fix is a fixed point, and check passes on its output', async () => {
        const once = await fix(found, contextFor());
        const twice = await fix(once.contents!, contextFor());
        expect(twice.contents).toEqual(once.contents);
        await check(once.contents!, contextFor());
        expect(once.contents).toMatchSnapshot();
      });
    }),
  );

  it('prep keeps __CHANG3_ME__ where prod would not', async () => {
    const found = JSON.stringify({
      ...DECLARED,
      database: {
        ...DECLARED.database,
        role: { crud: { username: 'service_user', password: '__CHANG3_ME__' } },
      },
    });
    const prep = genRdsConfigDeclaration({ env: 'prep', templatePath: '/unused' });
    const prod = genRdsConfigDeclaration({ env: 'prod', templatePath: '/unused' });
    await prep.check(found, contextFor());
    const error = await getError(() => prod.check(found, contextFor()));
    expect(error.message).toContain('database.role.crud.password');
  });
});
