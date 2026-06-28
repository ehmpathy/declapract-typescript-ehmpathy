import type { FileCheckContext } from 'declapract';

import { fix } from './dev.json.declapract';

describe('old-dev-config-location', () => {
  it('should move config/dev.json to config/prep.json', async () => {
    const contents = JSON.stringify(
      {
        organization: 'ahbode',
        project: 'svc-example',
        environment: { access: 'dev' },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('config/prep.json');
    expect(result.contents).toContain('"access": "prep"');
    expect(result.contents).not.toContain('"access": "dev"');
  });

  it('should update access: dev to access: prep', async () => {
    const contents = JSON.stringify(
      {
        organization: 'ahbode',
        project: 'svc-example',
        environment: { access: 'dev' },
        aws: { account: '123456789', namespace: 'test' },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);
    const parsed = JSON.parse(result.contents!);

    // snapshot for visual diff review
    expect(result.contents).toMatchSnapshot();

    expect(parsed.environment.access).toBe('prep');
    expect(result.relativeFilePath).toBe('config/prep.json');
  });

  it('should update .dev hostnames to .prep', async () => {
    const contents = JSON.stringify(
      {
        organization: 'ahbode',
        project: 'svc-example',
        environment: { access: 'dev' },
        database: {
          host: 'bastion.dev.example.com',
          tunnel: 'aws.ssmproxy.mydb.dev',
        },
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    // snapshot for visual diff review
    expect(result.contents).toMatchSnapshot();

    expect(result.contents).toContain('bastion.prep.example.com');
    expect(result.contents).toContain('aws.ssmproxy.mydb.prep');
    expect(result.contents).not.toContain('.dev');
  });
});
