import type { FileCheckContext } from 'declapract';

import { fix } from './dev.json.declapract';

describe('old-dev-config-location', () => {
  it('should move config/dev.json to config/prep.json', async () => {
    const contents = JSON.stringify(
      {
        database: {
          tunnel: {
            local: { host: 'bastion.dev.example.com' },
            lambda: { host: 'db.dev.example.com' },
          },
        },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('config/prep.json');
  });

  it('should replace .dev references with .prep', async () => {
    const contents = JSON.stringify(
      {
        database: {
          tunnel: {
            local: { host: 'bastion.dev.example.com' },
            lambda: { host: 'db.dev.example.com' },
          },
        },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    expect(result.contents).toContain('.prep.example.com');
    expect(result.contents).not.toContain('.dev.example.com');
  });

  it('should replace __CHANG3_ME__ with $.at(aws::param)', async () => {
    const contents = JSON.stringify(
      {
        database: {
          role: {
            cicd: { password: '__CHANG3_ME__' },
            crud: { password: '__CHANG3_ME__' },
          },
        },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    expect(result.contents).toContain('$.at(aws::param)');
    expect(result.contents).not.toContain('__CHANG3_ME__');
  });

  it('should replace access: dev with access: prep', async () => {
    const contents = JSON.stringify(
      {
        environment: { access: 'dev' },
        database: {
          tunnel: {
            local: { host: 'bastion.dev.example.com' },
          },
        },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);
    const parsed = JSON.parse(result.contents!);

    expect(parsed.environment.access).toBe('prep');
  });
});
