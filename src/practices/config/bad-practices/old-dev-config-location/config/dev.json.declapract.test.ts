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

  it('should migrate the access key and PRESERVE every host verbatim — mid-dotted, terminal, foreign, and url `.dev` all left exactly as found (guard #3: never guess a host)', async () => {
    const contents = JSON.stringify(
      {
        organization: 'ahbode',
        project: 'svc-example',
        environment: { access: 'dev' },
        database: {
          host: 'bastion.dev.example.com', // mid-dotted — could be a tier subdomain OR a foreign host's own label
          tunnel: 'aws.ssmproxy.mydb.dev', // terminal — axis-ambiguous (tier host vs public gTLD)
        },
        upstream: {
          paypal: 'api.dev.paypal.com', // FOREIGN public host — the mid-dotted `dev` is paypal's own label, not our tier
        },
        auth: {
          callbackUrl: 'https://auth.myapp.dev', // a .dev url → preserved (not a bare host)
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

    // the access itself — the one unambiguous key/value → migrated
    expect(result.contents).toContain('"access": "prep"');

    // EVERY host survives byte-for-byte. the util runs on a CONSUMER's real config, whose host
    // values are the consumer's own — a `.dev` label is axis-ambiguous WHEREVER it sits, so per
    // guard #3 (a rewrite that cannot verify its output must not guess) NO host is rewritten.
    expect(result.contents).toContain('bastion.dev.example.com');
    expect(result.contents).toContain('aws.ssmproxy.mydb.dev');
    expect(result.contents).toContain('https://auth.myapp.dev');

    // the FOREIGN public host is the decisive corruption case: a mid-dotted `dev` that is a
    // foreign host's own label must survive byte-for-byte. teeth: the prior mid-dotted rewrite
    // turned this into `api.prep.paypal.com`, a silent public-endpoint corruption (i013 r7.b1).
    expect(result.contents).toContain('api.dev.paypal.com');
    expect(result.contents).not.toContain('api.prep.paypal.com');

    // no host was flipped to `.prep`, so no wrong-tier value ever enters the config.
    expect(result.contents).not.toContain('bastion.prep.example.com');
    expect(result.contents).not.toContain('aws.ssmproxy.mydb.prep');

    // the migration emits no value it cannot verify — so no review marker bytes ever enter the
    // config (the JSON admits no comment; the access flip alone shows in the apply diff).
    expect(result.contents).not.toContain('@declapract:review');
  });

  it('should PRESERVE a bare-host terminal .dev verbatim (gTLD or ambiguous tier) — never guess, never mark', async () => {
    // the decisive ambiguous cell: a `.dev` stored as a BARE, TERMINAL host, no scheme.
    // structurally identical whether it is a public gTLD or an internal tier host, so the fix
    // cannot know the axis — it leaves it exactly as found. a silent `.prep` here is the auth
    // outage the wish's row-4 fix exists to prevent; a marker here is the corrupt-value break.
    const contents = JSON.stringify({ oauth: 'auth.myapp.dev' }, null, 2);
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    expect(result.contents).toContain('auth.myapp.dev');
    expect(result.contents).not.toContain('auth.myapp.prep');
    expect(result.contents).not.toContain('@declapract:review');
  });

  it('should NOT touch a non-host .dev value (email or path) — those carry no tier axis', async () => {
    // a value with an `@` (email) or a `/` (path) is structurally NOT a bare host, so the
    // host-shape match never matches it. the fix leaves it verbatim -- never rewritten, never
    // marked -- so a valid email or path cannot be corrupted.
    const contents = JSON.stringify(
      {
        environment: { access: 'dev' },
        contact: 'admin@company.dev', // email — has `@`, not a host
        logDir: '/var/log/app.dev/out.log', // path — has `/`, not a host
      },
      null,
      2,
    );
    const context = {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext;

    const result = await fix(contents, context);

    // the access itself is still migrated
    expect(result.contents).toContain('"access": "prep"');

    // the email and the path are left verbatim -- never rewritten, never marked.
    expect(result.contents).toContain('"admin@company.dev"');
    expect(result.contents).toContain('/var/log/app.dev/out.log');
    expect(result.contents).not.toContain('@declapract:review');
  });

  it('should be idempotent (a second fix pass is a no-op)', async () => {
    const contents = JSON.stringify(
      {
        environment: { access: 'dev' },
        database: {
          host: 'bastion.dev.example.com',
          tunnel: 'aws.ssmproxy.mydb.dev',
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

  it('should migrate EVERY access:dev occurrence, not just the first (a per-section override)', async () => {
    // a config may carry more than one `"access": "dev"` — a per-section override beside the
    // top-level tier. a first-only replace leaves the rest silently `dev`, and a re-run cannot
    // converge (its first match no-ops on the already-`prep` key).
    const contents = JSON.stringify(
      {
        environment: { access: 'dev' },
        overrides: { worker: { access: 'dev' } },
      },
      null,
      2,
    );

    const result = await fix(contents, {
      relativeFilePath: 'config/dev.json',
    } as FileCheckContext);

    // teeth: drop the /g flag and only the first `access: dev` flips -> this count reddens (1, not 2).
    expect((result.contents.match(/"access": "prep"/g) || []).length).toBe(2);
    expect(result.contents).not.toContain('"access": "dev"');
  });
});
