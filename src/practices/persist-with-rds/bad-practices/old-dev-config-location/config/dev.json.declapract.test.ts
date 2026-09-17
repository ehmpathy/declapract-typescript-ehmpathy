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

  it('should PRESERVE every host verbatim — a mid-dotted `.dev.` is never guessed to `.prep.` (guard #3)', async () => {
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

    // the util runs on a CONSUMER's real config, whose host values are the consumer's own — a
    // `.dev` label is axis-ambiguous WHEREVER it sits, so per guard #3 NO host is rewritten.
    // teeth: the prior mid-dotted rewrite flipped these to `.prep.example.com` (red now).
    expect(result.contents).toContain('bastion.dev.example.com');
    expect(result.contents).toContain('db.dev.example.com');
    expect(result.contents).not.toContain('.prep.example.com');

    // no review marker bytes ever enter the config value.
    expect(result.contents).not.toContain('@declapract:review');
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

  it('should PRESERVE every host verbatim — mid-dotted, terminal, foreign, and url `.dev` all left as found', async () => {
    const contents = JSON.stringify(
      {
        database: {
          tunnel: {
            local: { host: 'bastion.dev.example.com' }, // mid-dotted — could be tier OR a foreign label
            ssmproxy: 'aws.ssmproxy.mydb.dev', // terminal — ambiguous (tier host vs public gTLD)
          },
        },
        upstream: { paypal: 'api.dev.paypal.com' }, // FOREIGN public host — mid-dotted `dev` is paypal's own label
        auth: { callbackUrl: 'https://auth.myapp.dev' }, // .dev url → preserved
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    // EVERY host survives byte-for-byte — a `.dev` label is axis-ambiguous WHEREVER it sits, so
    // per guard #3 the util rewrites NO host at all.
    expect(result.contents).toContain('bastion.dev.example.com');
    expect(result.contents).toContain('aws.ssmproxy.mydb.dev');
    expect(result.contents).toContain('https://auth.myapp.dev');

    // the FOREIGN public host is the decisive corruption case: teeth — the prior mid-dotted
    // rewrite turned this into `api.prep.paypal.com`, a silent public-endpoint corruption.
    expect(result.contents).toContain('api.dev.paypal.com');
    expect(result.contents).not.toContain('api.prep.paypal.com');

    // no host was flipped to `.prep`, and no review marker bytes ever enter the config.
    expect(result.contents).not.toContain('.prep.example.com');
    expect(result.contents).not.toContain('aws.ssmproxy.mydb.prep');
    expect(result.contents).not.toContain('@declapract:review');
  });

  it('should be idempotent (a second fix pass is a no-op)', async () => {
    const contents = JSON.stringify(
      {
        database: {
          tunnel: {
            local: { host: 'bastion.dev.example.com' },
            ssmproxy: 'aws.ssmproxy.mydb.dev',
          },
        },
        auth: { callbackUrl: 'https://auth.myapp.dev' },
      },
      null,
      2,
    );

    const once = await fix(contents, {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext);
    const twice = await fix(once.contents, {
      relativeFilePath: once.relativeFilePath!,
    } as FileCheckContext);

    expect(twice.contents).toEqual(once.contents);
    expect(twice.relativeFilePath).toEqual(once.relativeFilePath);
  });
});
