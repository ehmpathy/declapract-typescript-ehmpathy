import { readFileSync } from 'fs';
import { join } from 'path';
import { given, then } from 'test-fns';

import {
  fix,
  withInsertOnceBefore,
  withPackageArtifact,
  withPrunePlugin,
} from './best-practice/serverless.yml.declapract';

describe('serverless.yml', () => {
  given(
    'the exported leaf transformers, exercised independently (r4 n1 recomposition surface)',
    () => {
      // r4 i030 nitpick (arch-opport-decomposition): the with* transformers + withInsertOnceBefore
      // were unexported module-locals, so none could be unit-tested or recomposed independently —
      // only the composed `fix` was exercised, and a per-leaf defect (the withPackageArtifact /
      // withPrunePlugin anchor fragility, i006/i007) hid in a composite snapshot rather than a named
      // leaf assertion. exporting the leaf-most-fragile transformers makes the decomposition an
      // independent surface. these cases exercise them in isolation, off the fold.

      then('withInsertOnceBefore is idempotent when the guard is already present', () => {
        const held = 'service: x\n\nplugins:\n  - serverless-prune-plugin\n\nprovider:\n';
        const out = withInsertOnceBefore({
          contents: held,
          guard: '- serverless-prune-plugin',
          section: 'plugins',
          anchor: /\nprovider:/,
          insert: '\nplugins:\n  - serverless-prune-plugin\n\nprovider:',
        });
        expect(out).toEqual(held); // guard hit -> a no-op return
      });

      then('withInsertOnceBefore soft-skips a pre-extant section with a review marker, not a clobber', () => {
        const legacy = 'service: x\n\nplugins:\n  - serverless-esbuild\n\nprovider:\n';
        const out = withInsertOnceBefore({
          contents: legacy,
          guard: '- serverless-prune-plugin',
          section: 'plugins',
          anchor: /\nprovider:/,
          insert: '\nplugins:\n  - serverless-prune-plugin\n\nprovider:',
        });
        expect((out.match(/\nplugins:/g) || []).length).toBe(1); // no second plugins: key
        expect(out).toContain('serverless-esbuild'); // consumer plugin preserved
        expect(out).toContain('@declapract:review'); // the actionable marker, not a silent stall
      });

      then('withInsertOnceBefore lands the insert on an anchor match when absent', () => {
        const bare = 'service: x\n\nprovider:\n  name: aws\n';
        const out = withInsertOnceBefore({
          contents: bare,
          guard: 'artifact: .artifact/contents.zip',
          section: 'package',
          anchor: /\nprovider:/,
          insert: '\npackage:\n  artifact: .artifact/contents.zip\n\nprovider:',
        });
        expect(out).toContain('package:\n  artifact: .artifact/contents.zip');
      });

      then('withPackageArtifact + withPrunePlugin recompose off the fold', () => {
        const bare = 'service: x\n\nprovider:\n  name: aws\n';
        const out = withPrunePlugin({
          contents: withPackageArtifact({ contents: bare }),
        });
        expect(out).toContain('artifact: .artifact/contents.zip');
        expect(out).toContain('plugins:\n  - serverless-prune-plugin');
      });
    },
  );
  given('a sls.yaml with STAGE env var', () => {
    const example = `
service: svc-example

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true
    `.trim();

    then('it should add accessByStage custom block', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('accessByStage:');
      expect(fixed.contents).toContain('dev: prep'); // stage=dev (ancient slug) uses ACCESS=prep
      expect(fixed.contents).toContain('prod: prod');
    });

    then('it dual-publishes: accessByStage carries the prep→prep contemp key', async () => {
      // teeth: the north-star dual-publish maps BOTH non-prod stages to the prep access —
      // `dev` (the ancient -dev- fleet) AND `prep` (the contemp -prep- fleet). drop the `prep: prep`
      // entry and self publishes only the ancient slug, so the D31 acceptance suite (which targets
      // the contemp -prep- fleet) lands on a name no deploy publishes. this assertion reddens on
      // that regression.
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('prep: prep');
    });

    then('it should replace STAGE with ACCESS + COMMIT', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('ACCESS:');
      expect(fixed.contents).toContain('COMMIT:');
      expect(fixed.contents).not.toContain('STAGE: ${self:provider.stage}');
    });

    then('it should add variablesResolutionMode after service line', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('variablesResolutionMode: 20210326');
    });

    then('the composed fix over this example matches snapshot', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toMatchSnapshot('STAGE example — after');
    });

    then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
      const once = await fix(example, {} as any);
      const twice = await fix(once.contents!, {} as any);
      expect(twice.contents).toEqual(once.contents);
    });
  });

  given('a sls.yaml that needs the timezone environmental variable', () => {
    const example = `
service: svc-notifications

package:
  artifact: .artifact/contents.zip

plugins:
  - serverless-prune-plugin

provider:
  name: aws
  runtime: nodejs16.x
  memorySize: 1024 # optional, in MB, default is 1024
  timeout: 60 # default timeout to 1min, for resilience against increased cold start times; individual functions can override this
  stage: \${opt:stage}
  stackTags:
    app: ahbode
    environment: \${self:provider.stage}
    product: \${self:service}
  environment:
    NODE_ENV: production # deploy with production optimizations of all resources
    STAGE: \${self:provider.stage} # the deploy stage
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
  deploymentBucket: serverless-deployment-xyz-\${self:provider.stage}
    `.trim();
    then('it should be able to add the timezone env var', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('TZ: UTC');
    });
  });

  given(
    'a legacy sls.yaml whose NODE_ENV references custom.stageToNodeEnvMapping (r7.b1)',
    () => {
      // r7 i012 blocker: the fix inserts a `custom:` block that holds only `accessByStage`, yet a
      // legacy NODE_ENV reads `${self:custom.stageToNodeEnvMapping.${self:provider.stage}}` — a key
      // the emitted custom: block never declares. the old fix left that reference verbatim, so its
      // own output deploy-failed and failed its own CONTAINS check (which requires the go-forward
      // literal `NODE_ENV: production`). withNodeEnvProduction rewrites the value to the literal.
      const example = `
service: svc-legacy-nodeenv

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: \${self:custom.stageToNodeEnvMapping.\${self:provider.stage}}
  deploymentBucket: serverless-deployment-\${self:provider.stage}
    `.trim();

      then('it rewrites NODE_ENV to the go-forward literal `production`', async () => {
        // teeth: drop withNodeEnvProduction -> this reddens (the legacy reference survives)
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).toContain('NODE_ENV: production');
      });

      then('it emits no reference to the undeclared stageToNodeEnvMapping key', async () => {
        // teeth: the emitted custom: block declares only accessByStage, so a surviving
        // stageToNodeEnvMapping reference would deploy-fail and fail the fix's own CONTAINS check
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).not.toContain('stageToNodeEnvMapping');
      });

      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const once = await fix(example, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });
    },
  );

  given('a sls.yaml that needs account:GetAccountInformation policy', () => {
    const example = `
service: svc-example

provider:
  name: aws
  runtime: nodejs16.x
  iamRoleStatements:
    # parameter store access
    - Effect: Allow
      Action:
        - ssm:GetParameter
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/*
    `.trim();

    then(
      'it should append GetAccountInformation policy if not already present',
      async () => {
        const fixed = await fix(example, {} as any);
        expect(fixed.contents).toContain('account:GetAccountInformation');
        expect(fixed.contents).toContain(
          '# allow access inference from account name',
        );
      },
    );

    then(
      'it should not duplicate GetAccountInformation policy if already present',
      async () => {
        const exampleWithPolicy = `
service: svc-example

provider:
  name: aws
  runtime: nodejs16.x
  iamRoleStatements:
    # allow access inference from account name
    - Effect: Allow
      Action:
        - account:GetAccountInformation
      Resource: '*'
      `.trim();
        const fixed = await fix(exampleWithPolicy, {} as any);
        const matches = (
          fixed.contents?.match(/account:GetAccountInformation/g) || []
        ).length;
        expect(matches).toBe(1);
      },
    );
  });

  given('a sls.yaml whose service line carries an inline comment (D41)', () => {
    const example = `
service: svc-example # the primary example service

provider:
  name: aws
  stage: \${opt:stage}
    `.trim();

    then('it should still insert the package artifact block', async () => {
      const fixed = await fix(example, {} as any);
      // teeth: the old /service: ([a-zA-Z0-9-]+)\\n\\n?provider:/ anchor failed on a commented
      // service line, so this insert silently never landed.
      expect(fixed.contents).toContain('artifact: .artifact/contents.zip');
    });

    then('it should still insert variablesResolutionMode', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain('variablesResolutionMode: 20210326');
    });

    then('it should preserve the inline comment on the service line', async () => {
      const fixed = await fix(example, {} as any);
      expect(fixed.contents).toContain(
        'service: svc-example # the primary example service',
      );
    });
  });

  given('a sls.yaml whose service name carries an underscore (r7.n3)', () => {
    // r7 i012 nitpick: the old anchor `/^service: [a-zA-Z0-9-]+/m` never matched a legal service
    // name with an underscore (`svc_orders`), so variablesResolutionMode soft-skipped for a valid
    // name. the widened `\\S[^\\n]*` name class matches ANY legal service name, so it converges.
    const example = `
service: svc_orders

provider:
  name: aws
  stage: \${opt:stage}
    `.trim();

    then('it inserts variablesResolutionMode after an underscore service name', async () => {
      // teeth: revert the anchor to [a-zA-Z0-9-]+ -> this reddens (svc_orders never matches)
      const fixed = (await fix(example, {} as any)).contents ?? '';
      expect(fixed).toContain('variablesResolutionMode: 20210326');
      expect(fixed).toContain('service: svc_orders');
    });
  });

  given(
    'a sls.yaml with a block between service: and provider:, no plugins block yet',
    () => {
      // r10/r11 i006 blocker: withPackageArtifact anchored on `service: ...\n\n?provider:`, so a
      // block that sits between service: and provider: made it (and its paired withPrunePlugin) a
      // silent no-op. this isolates the case the legacy fixture does not — a block between them AND
      // no plugins block yet, so withPrunePlugin must CREATE one.
      const example = `
service: svc-isolated

frameworkVersion: '3'

provider:
  name: aws
  stage: \${opt:stage}
    `.trim();

      then('it inserts the package artifact despite the block between', async () => {
        const fixed = (await fix(example, {} as any)).contents ?? '';
        // teeth: revert the provider:-anchor -> this reddens (the old regex could not fire here)
        expect(fixed).toContain('package:\n  artifact: .artifact/contents.zip');
      });

      then('it CREATES a plugins block with the prune plugin (none present)', async () => {
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).toContain('plugins:\n  - serverless-prune-plugin');
        expect((fixed.match(/\nplugins:/g) || []).length).toBe(1);
      });

      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const once = await fix(example, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });
    },
  );

  given(
    'a sls.yaml whose package: block carries an extra key after artifact: (D41 prune anchor)',
    () => {
      // r11 i007 blocker: withPrunePlugin anchored on the literal bytes withPackageArtifact emits
      // (`  artifact: .artifact/contents.zip\n\nprovider:`), so a package: block with ANY other key
      // after artifact: (individually:, patterns:, … — all common) silently defeated the anchor and
      // the prune plugin was never inserted — the exact silent-no-op class i006 fixed for
      // withPackageArtifact, reproduced one function over. the structural /\nprovider:/ anchor holds
      // regardless of the package: block's shape.
      const example = `
service: svc-extra

package:
  artifact: .artifact/contents.zip
  individually: true

provider:
  name: aws
  stage: \${opt:stage}
    `.trim();

      then('it still inserts the prune plugin despite the extra package key', async () => {
        const fixed = (await fix(example, {} as any)).contents ?? '';
        // teeth: revert withPrunePlugin's anchor to the literal-output coupled form -> this reddens
        // (the old literal anchor cannot match past the `individually:` key)
        expect(fixed).toContain('plugins:\n  - serverless-prune-plugin');
        expect((fixed.match(/\nplugins:/g) || []).length).toBe(1);
        // the pre-existent package key survives untouched
        expect(fixed).toContain('individually: true');
      });

      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const once = await fix(example, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });
    },
  );

  given('a sls.yaml with no provider: key at all (anchor-miss soft-skip)', () => {
    // r7 i012 blocker: withInsertOnceBefore SOFT-SKIPS an anchor miss (returns the contents
    // unchanged), it does not throw. a throw aborts the whole 14-transform fold, so a common
    // arrival shape would block every unrelated repair. the un-inserted block is absent from the
    // output, so the overall CONTAINS check (which requires it) reddens `declapract plan` — the
    // signal. a file absent a provider: key gives withPackageArtifact's insert no anchor to land.
    const example = `
service: svc-noprovider

frameworkVersion: '3'
    `.trim();

    then('the package artifact soft-skips (no provider: anchor to land before)', () => {
      // teeth: give withInsertOnceBefore a throw-on-miss again -> the whole fix throws instead of
      // a partial return; the soft-skip returns the contents with the block absent.
      const fixed = fix(example, {} as any).contents ?? '';
      expect(fixed).not.toContain('artifact: .artifact/contents.zip');
    });

    then('a peer transform whose anchor DOES match still lands (no chain abort)', () => {
      // teeth: variablesResolutionMode anchors on the `service:` line (present), so it lands even
      // though withPackageArtifact soft-skipped — proof one miss does not abort the fold.
      const fixed = fix(example, {} as any).contents ?? '';
      expect(fixed).toContain('variablesResolutionMode: 20210326');
    });

    then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
      const once = await fix(example, {} as any);
      const twice = await fix(once.contents!, {} as any);
      expect(twice.contents).toEqual(once.contents);
    });
  });

  given(
    'a legacy sls.yaml that already holds a section under different content (r7 clobber-refusal)',
    () => {
      // r5 i008 blocker (arch-hazards-behavior): the section-insert transformers guarded only on
      // DECLARED CONTENT, so a consumer whose legacy file already holds a `package:` / `plugins:` /
      // `custom:` block under DIFFERENT content got a SECOND top-level key inserted — a yaml
      // last-wins clobber that silently drops the consumer's block while CONTAINS still passes.
      // r7 i012 blocker: the decline of that duplicate must not THROW (a throw aborts the whole
      // fold and blocks every peer repair). the `section` guard now SOFT-SKIPS the insert, so no
      // second key lands (the consumer's block is never clobbered) AND the peer transforms still
      // land; CONTAINS (which requires the declared block) reddens `plan` to surface the manual merge.

      then('it declines a second package: block, and never clobbers the consumer key', () => {
        const example = `
service: svc-haspackage

package:
  individually: true

provider:
  name: aws
  stage: \${opt:stage}
        `.trim();
        // teeth: drop the `section: 'package'` guard -> a SECOND top-level package: key lands
        // (a yaml last-wins clobber of `individually: true`); with the guard, exactly one remains.
        const fixed = fix(example, {} as any).contents ?? '';
        expect((fixed.match(/\npackage:/g) || []).length).toBe(1);
        expect(fixed).toContain('individually: true');
      });

      then('it declines a second plugins: block, and never clobbers the consumer plugin', () => {
        const example = `
service: svc-hasplugins

plugins:
  - serverless-esbuild

provider:
  name: aws
  stage: \${opt:stage}
        `.trim();
        // teeth: drop the `section: 'plugins'` guard -> a SECOND top-level plugins: key lands, and
        // yaml last-wins silently drops the consumer's serverless-esbuild plugin.
        const fixed = fix(example, {} as any).contents ?? '';
        expect((fixed.match(/\nplugins:/g) || []).length).toBe(1);
        expect(fixed).toContain('serverless-esbuild');
      });

      then('it declines a second custom: block, and never clobbers the consumer custom', () => {
        const example = `
service: svc-hascustom

custom:
  domain: api.example.com

provider:
  name: aws
  stage: \${opt:stage}
        `.trim();
        // teeth: drop the `section: 'custom'` guard -> a SECOND top-level custom: key lands, and
        // yaml last-wins silently drops the consumer's custom block.
        const fixed = fix(example, {} as any).contents ?? '';
        expect((fixed.match(/\ncustom:/g) || []).length).toBe(1);
        expect(fixed).toContain('domain: api.example.com');
      });

      // .note = the marker is a COMPENSATION, not the endpoint: a consumer who runs `declapract
      //         plan` still reads only green/red, so the in-file marker text is the sole
      //         could-not-fire signal. the durable "could-not-fire vs passed" plan signal is owed
      //         upstream (ehmpathy/declapract#107); until it lands, the snapshot below clamps the
      //         marker text so a reword cannot silently drop the diagnostic.
      then('the section soft-skip injects an actionable @declapract:review marker, not a silent stall', () => {
        const example = `
service: svc-hascustom

custom:
  domain: api.example.com

provider:
  name: aws
  stage: \${opt:stage}
        `.trim();
        const fixed = fix(example, {} as any).contents ?? '';
        // r9 i022 blocker: the soft-skip must name the hand-merge, not return unchanged. the marker
        // is injected above the extant custom: block and names the section to merge.
        expect(fixed).toContain('@declapract:review');
        expect(fixed).toContain('merge the declared `custom` keys');
        expect(fixed).toContain('into your extant `custom:` block by hand');
        // and CONTAINS stays red — the marker does NOT auto-satisfy the declared accessByStage key
        expect(fixed).not.toContain('accessByStage:');
        // teeth: a silent return (no marker) reddens this — the consumer would get no diagnostic
        // snapshot the marker verbatim — it is user-faced output; a reword must redden a vibecheck,
        // not slip past the toContain asserts above (rule.require.snapshots)
        expect(fixed).toMatchSnapshot('section soft-skip custom clobber — review marker');
      });

      then('the marker injection is idempotent (a second fix adds no second marker)', () => {
        const example = `
service: svc-hascustom

custom:
  domain: api.example.com

provider:
  name: aws
  stage: \${opt:stage}
        `.trim();
        const once = fix(example, {} as any).contents ?? '';
        const twice = fix(once, {} as any).contents ?? '';
        // fixed point: a re-run over the marked file changes zero bytes
        expect(twice).toEqual(once);
        // exactly one marker, never a stack of them across runs
        expect((twice.match(/@declapract:review — a `custom:`/g) || []).length).toBe(1);
      });

      then('a peer transform still lands despite the section soft-skip (no chain abort)', () => {
        const example = `
service: svc-haspackage

package:
  individually: true

provider:
  name: aws
  stage: \${opt:stage}
        `.trim();
        // teeth: variablesResolutionMode lands even though withPackageArtifact soft-skipped the
        // clobber — proof the section soft-skip does not abort the fold.
        const fixed = fix(example, {} as any).contents ?? '';
        expect(fixed).toContain('variablesResolutionMode: 20210326');
      });

      then('it emits no ACCESS ref to custom.access when withAccessByStage soft-skipped (r7 b1 unresolvable-ref)', () => {
        // r7 i030 blocker (arch-hazards-behavior): a legacy consumer with a pre-extant top-level
        // `custom:` block makes withAccessByStage soft-skip its accessByStage/access insert (it only
        // injects a review marker), so `custom.access` is never declared. withAccessCommitEnv,
        // however, guarded only on `STAGE:` present + `ACCESS:` absent — so it still rewrote STAGE ->
        // `ACCESS: ${self:custom.access}`, a ref to a var the output never declares (a
        // caller-without-callee that fails serverless variable resolution at deploy). the new
        // `!includes('accessByStage:')` guard soft-skips this rewrite until that block lands.
        const example = `
service: svc-hascustom-stage

custom:
  domain: api.example.com

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
        `.trim();
        const fixed = fix(example, {} as any).contents ?? '';
        // the block that would declare custom.access did soft-skip (a custom: block already exists)
        expect(fixed).not.toContain('accessByStage:');
        // teeth: drop the `!includes('accessByStage:')` guard from withAccessCommitEnv -> the rewrite
        // fires anyway and emits `ACCESS: ${self:custom.access}` against no declaration; this reddens.
        expect(fixed).not.toContain('ACCESS: ${self:custom.access}');
        // and the STAGE var is left intact for the human's later hand-merge + a subsequent fix pass
        expect(fixed).toContain('STAGE: ${self:provider.stage}');
      });

      then('the unresolvable-ref soft-skip is idempotent (a second fix adds no ACCESS ref)', () => {
        const example = `
service: svc-hascustom-stage

custom:
  domain: api.example.com

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
        `.trim();
        const once = fix(example, {} as any).contents ?? '';
        const twice = fix(once, {} as any).contents ?? '';
        expect(twice).toEqual(once);
        expect(twice).not.toContain('ACCESS: ${self:custom.access}');
      });
    },
  );

  given(
    'a sls.yaml whose environment block exists but the anchors miss (r7 soft-skip)',
    () => {
      // r7 i012 blocker: withUtcTimezone / withConnectionReuse anchored on exact byte sequences,
      // and threw on a miss — an abort of the whole fold for a common shape (a var before NODE_ENV,
      // or no deploymentBucket line). the throw was dropped: a miss now SOFT-SKIPS (returns unchanged),
      // so a single miss never aborts the fold.
      // i034 r008.b2 then CONVERGED withConnectionReuse: its anchor is now the NODE_ENV line ALONE,
      // so the no-deploymentBucket shape lands the flag rather than a red-forever stall. withUtcTimezone
      // still cannot land the line on a var-before-NODE_ENV shape (a convergent widen there risks a
      // per-function `environment:` block, deferred to
      // .dream/v2026_09_10.fix.serverless-soft-skip-convergence.md) — but i035 r009.b1 replaced its
      // bare no-op with an actionable `@declapract:review` marker that names the shape to converge, so
      // a live consumer sees WHICH shape failed rather than a silent stall while peers land.

      then('withUtcTimezone emits an actionable review marker when NODE_ENV sits below another env var', () => {
        // environment: exists, but STAGE precedes NODE_ENV, so `environment:\n    NODE_ENV:` misses
        const example = `
service: svc-shuffled

provider:
  name: aws
  environment:
    STAGE: \${self:provider.stage}
    NODE_ENV: production
        `.trim();
        const fixed = fix(example, {} as any).contents ?? '';
        // the env line still cannot land on this shape (CONTAINS reddens the absent TZ line). the
        // emitted env child carries a trailing comment, so match that exact form — the marker text
        // itself names `TZ: UTC`, so a bare substring check would false-pass on the marker.
        expect(fixed).not.toContain('TZ: UTC # guarantee');
        // i035 r009.b1 teeth: the soft-skip is NOT silent — it emits a marker that names the line + why
        // the auto-insert declined. revert withUtcTimezone's else-branch to a bare `.replace` no-op
        // and this reddens (no marker), the non-convergent-with-no-diagnostic class the rule forbids.
        expect(fixed).toContain('@declapract:review');
        expect(fixed).toContain('add `TZ: UTC`'); // named inside the marker as the line to add by hand
        // a peer transform still lands: STAGE -> ACCESS + COMMIT
        expect(fixed).toContain('ACCESS:');
        // snapshot the marker verbatim — user-faced output; a reword must redden a vibecheck, not
        // slip past the toContain asserts above (rule.require.snapshots)
        expect(fixed).toMatchSnapshot('withUtcTimezone shuffled-env — review marker');
      });

      then('the withUtcTimezone review marker is idempotent (a second apply adds no duplicate)', () => {
        const example = `
service: svc-shuffled

provider:
  name: aws
  environment:
    STAGE: \${self:provider.stage}
    NODE_ENV: production
        `.trim();
        const once = fix(example, {} as any).contents ?? '';
        const twice = fix(once, {} as any).contents ?? '';
        expect(twice).toEqual(once);
        // exactly one TZ marker, never a re-inserted or duplicated comment line (this shape now
        // converges withConnectionReuse via the go-forward `NODE_ENV: production` anchor, so the TZ
        // marker is the only one — assert its count is 1)
        expect((twice.match(/could not auto-insert `TZ: UTC`/g) || []).length).toBe(1);
      });

      then('withConnectionReuse CONVERGES on a go-forward `NODE_ENV: production` file that lacks the flag (i035 r008.n3)', () => {
        // an env block already on the go-forward `NODE_ENV: production` (not the legacy map) that
        // lacks the flag — e.g. it was hand-edited out. the legacy anchor misses, but the go-forward
        // anchor lands the flag on the next line, so the file CONVERGES rather than a marker-only red
        // plan. TZ is already present so withUtcTimezone skips cleanly.
        const example = `
service: svc-goforward

provider:
  name: aws
  environment:
    TZ: UTC
    NODE_ENV: production
        `.trim();
        const fixed = fix(example, {} as any).contents ?? '';
        // teeth: the go-forward anchor lands the flag directly after the production line. remove the
        // `NODE_ENV: production` go-forward branch in withConnectionReuse and this reddens (the flag
        // never lands, and the shape falls back to a marker — the r008.n3 non-convergence class).
        expect(fixed).toContain(
          'NODE_ENV: production\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https',
        );
        // no marker for the flag — it converged, not merely diagnosed
        expect(fixed).not.toContain(
          'could not auto-insert `AWS_NODEJS_CONNECTION_REUSE_ENABLED: true`',
        );
        // idempotent: a second apply is a no-op (the includes-guard fires)
        const twice = fix(fixed, {} as any).contents ?? '';
        expect(twice).toEqual(fixed);
      });

      then('withConnectionReuse CONVERGES when there is no deploymentBucket line (i034 r008.b2)', () => {
        // environment: exists with the NODE_ENV map, TZ already present (so withUtcTimezone skips),
        // and NO deploymentBucket line. the anchor is now the NODE_ENV line ALONE (i034 r008.b2), so
        // the flag lands regardless of what succeeds the environment block — no red-forever for the
        // no-deploymentBucket shape.
        const example = `
service: svc-nobucket

provider:
  name: aws
  environment:
    TZ: UTC
    NODE_ENV: \${self:custom.stageToNodeEnvMapping.\${self:provider.stage}}
        `.trim();
        // teeth: restore the old two-line anchor (require `\n  deploymentBucket` after NODE_ENV) ->
        // this reddens (the flag is never landed for a file with no deploymentBucket line).
        const fixed = fix(example, {} as any).contents ?? '';
        expect(fixed).toContain('AWS_NODEJS_CONNECTION_REUSE_ENABLED: true');
        // the flag lands at env indent, directly after the NODE_ENV line. the full fix() pipeline
        // runs withConnectionReuse (lands the flag after the legacy NODE_ENV line) THEN
        // withNodeEnvProduction (rewrites that NODE_ENV line to the go-forward `production` literal),
        // so the converged adjacency is `NODE_ENV: production` + the flag on the next env-indent line.
        expect(fixed).toContain(
          'NODE_ENV: production # deploy with production optimizations of all resources, to make `prep` and `prod` stage deployments equivalent functionally (i.e., the same code paths in prep and prod)\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true',
        );
        // idempotent: a second apply is a no-op (the includes-guard fires)
        const twice = fix(fixed, {} as any).contents ?? '';
        expect(twice).toEqual(fixed);
      });
    },
  );

  given(
    'a sls.yaml whose ssm grant is list-form or an unmatched shape (r9 non-convergence)',
    () => {
      // r9 i011 blocker: withSsmGetParameter anchored ONLY on the inline `Action: 'ssm:GetParameters'`
      // form, so a consumer on the list-item form (`Action:\n  - ssm:GetParameters`) got a silent
      // no-op — the singular grant was never added and CONTAINS stayed red. the transformer now
      // handles BOTH plural shapes, and SOFT-SKIPS a third shape neither anchor matched.

      then('it augments the list-item plural form with the singular', async () => {
        const example = `
service: svc-listform

provider:
  name: aws
  iamRoleStatements:
    - Effect: Allow
      Action:
        - ssm:GetParameters
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/*
        `.trim();
        // teeth: drop the list-form branch -> this reddens (the inline anchor misses the list form
        // and the fix soft-skips, so the singular stays ungranted)
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).toContain('- ssm:GetParameter\n');
        expect(fixed).toContain('- ssm:GetParameters');
      });

      then('a second apply over the list-form fix is a no-op', async () => {
        const example = `
service: svc-listform

provider:
  name: aws
  iamRoleStatements:
    - Effect: Allow
      Action:
        - ssm:GetParameters
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/*
        `.trim();
        const once = await fix(example, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });

      then('it grants the singular to EVERY plural block, not just the first (global)', async () => {
        // two separate statements each grant ssm:GetParameters; the fix must add the singular to
        // BOTH — a first-only replace leaves the second block under-granted and CONTAINS red for it.
        const example = `
service: svc-twoblocks

provider:
  name: aws
  iamRoleStatements:
    - Effect: Allow
      Action:
        - ssm:GetParameters
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/one/*
    - Effect: Allow
      Action:
        - ssm:GetParameters
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/two/*
        `.trim();
        // teeth: drop the /g flag from the list-form replace -> only the first block gains the
        // singular -> this count assertion reddens (1, not 2).
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect((fixed.match(/- ssm:GetParameter\n/g) || []).length).toEqual(2);
        // and a re-run stays a no-op across BOTH blocks (per-occurrence idempotency, global)
        const twice = (await fix(fixed, {} as any)).contents ?? '';
        expect(twice).toEqual(fixed);
      });

      then('it soft-skips when the plural sits in a shape neither anchor matched', () => {
        // a double-quoted inline plural matches neither the single-quoted inline anchor nor the
        // list-item anchor, so the singular cannot be granted automatically
        const example = `
service: svc-quoted

provider:
  name: aws
  iamRoleStatements:
    - Effect: Allow
      Action: "ssm:GetParameters"
      Resource: arn:aws:ssm:\${aws:region}:\${aws:accountId}:parameter/*
        `.trim();
        // teeth: give withSsmGetParameter a throw-on-miss -> the whole fix throws; the soft-skip
        // leaves the singular ungranted (CONTAINS reddens plan) and preserves the plural verbatim.
        const fixed = fix(example, {} as any).contents ?? '';
        expect(fixed).not.toContain('- ssm:GetParameter\n');
        expect(fixed).toContain('"ssm:GetParameters"');
      });
    },
  );

  given(
    'a legacy sls.yaml with a stage-keyed deploymentBucket (i031 r2.b1 non-convergence)',
    () => {
      // i031 r2 blocker (mech-failhides): #596 added `custom.deploymentBucketByStage` + a
      // `provider.deploymentBucket` that reads the map to the template, governed by CONTAINS, plus a
      // template clamp — but NO transform emitted either, so a legacy consumer (old
      // `deploymentBucket: <base>-${self:provider.stage}` line, no map) ran `declapract fix`, the map
      // was never added, and CONTAINS stayed RED forever with no diagnostic — a non-convergent fix
      // (the row-1 class the wish forbids). worse, the stale stage-keyed line resolves to a
      // nonexistent `-prep` bucket on a prep deploy (only -dev + -prod exist) — the #596 break itself.
      // withDeploymentBucketByStage derives the bucket base from the consumer's own line (never a
      // guess) and emits the map + rewrites the reference.

      then('it emits the deploymentBucketByStage map, base derived from the consumer line (with ns)', async () => {
        const example = `
service: svc-orders

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
  deploymentBucket: serverless-deployment-orders-\${self:provider.stage}
        `.trim();
        // teeth: drop withDeploymentBucketByStage from the fold -> all three of these redden (the map
        // is never emitted and the stale stage-keyed reference survives).
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).toContain('deploymentBucketByStage:');
        expect(fixed).toContain('dev: serverless-deployment-orders-dev');
        expect(fixed).toContain('prep: serverless-deployment-orders-dev');
        expect(fixed).toContain('prod: serverless-deployment-orders-prod');
      });

      then('it rewrites the stage-keyed reference to the map, no bare -${stage} name survives', async () => {
        const example = `
service: svc-orders

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
  deploymentBucket: serverless-deployment-orders-\${self:provider.stage}
        `.trim();
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).toContain(
          "deploymentBucket: ${self:custom.deploymentBucketByStage.${opt:stage}, 'serverless-deployment-orders-dev'}",
        );
        // teeth: the stale stage-keyed provider line — the #596 break — is gone
        expect(fixed).not.toContain(
          'deploymentBucket: serverless-deployment-orders-${self:provider.stage}',
        );
      });

      then('it derives a base with no namespace segment too', async () => {
        // the no-ns legacy shape `serverless-deployment-${self:provider.stage}` (the fixture used by
        // the timezone + full-composed givens): base derives to `serverless-deployment`.
        const example = `
service: svc-nons

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
  deploymentBucket: serverless-deployment-\${self:provider.stage}
        `.trim();
        const fixed = (await fix(example, {} as any)).contents ?? '';
        expect(fixed).toContain('dev: serverless-deployment-dev');
        expect(fixed).toContain('prod: serverless-deployment-prod');
        expect(fixed).toContain(
          "deploymentBucket: ${self:custom.deploymentBucketByStage.${opt:stage}, 'serverless-deployment-dev'}",
        );
      });

      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const example = `
service: svc-orders

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
  deploymentBucket: serverless-deployment-orders-\${self:provider.stage}
        `.trim();
        const once = await fix(example, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });

      then('it emits no deploymentBucketByStage ref when withAccessByStage soft-skipped (caller-without-callee)', () => {
        // a legacy consumer with a pre-extant top-level `custom:` block makes withAccessByStage
        // soft-skip (a review marker, no accessByStage:), so custom.deploymentBucketByStage is never
        // declared. teeth: drop the `!includes('accessByStage:')` guard -> the map-reference emits
        // against no declaration (a caller-without-callee); this reddens.
        const example = `
service: svc-hascustom-bucket

custom:
  domain: api.example.com

provider:
  name: aws
  stage: \${opt:stage}
  deploymentBucket: serverless-deployment-orders-\${self:provider.stage}
        `.trim();
        const fixed = fix(example, {} as any).contents ?? '';
        expect(fixed).not.toContain('accessByStage:');
        expect(fixed).not.toContain('deploymentBucketByStage:');
        // the stale stage-keyed line is left intact for the human's hand-merge + a later fix pass
        expect(fixed).toContain(
          'deploymentBucket: serverless-deployment-orders-${self:provider.stage}',
        );
      });

      then('it soft-skips a consumer with no deploymentBucket line (no base to derive, no guess)', async () => {
        // a value the fix cannot know is never invented: no bucket line -> no base -> soft-skip, and
        // CONTAINS surfaces the residual as a red plan rather than a guessed namespace.
        const example = `
service: svc-nobucket-at-all

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
        `.trim();
        const fixed = (await fix(example, {} as any)).contents ?? '';
        // accessByStage still lands (its own transform fired) — proof the soft-skip is local
        expect(fixed).toContain('accessByStage:');
        // but no map is invented from a namespace the fix does not hold
        expect(fixed).not.toContain('deploymentBucketByStage:');
        // AND the silent soft-skip is truly silent: no review marker on a bucket-less file
        expect(fixed).not.toContain('@declapract:review');
        expect(fixed).not.toContain(
          'could not derive an account-scoped `deploymentBucketByStage`',
        );
      });

      then('it emits a review marker when a deploymentBucket line exists but misses the legacy shape', async () => {
        // r10 nitpick: a `deploymentBucket:` line present in a shape the fix cannot read (not the
        // legacy `serverless-deployment...-${self:provider.stage}` pattern) gets a NAMED next step,
        // in step with the env-insert soft-skips — not a silent no-op that reads as "no action owed".
        const example = `
service: svc-odd-bucket

provider:
  name: aws
  stage: \${opt:stage}
  deploymentBucket: my-custom-hardcoded-bucket
  environment:
    NODE_ENV: production
    STAGE: \${self:provider.stage} # the deploy stage
        `.trim();
        const fixed = (await fix(example, {} as any)).contents ?? '';
        // teeth: drop the `includes('deploymentBucket:')` guard's marker branch -> this reddens (a
        // non-matching bucket line would then soft-skip silently, the exact silent no-op r10 flagged)
        expect(fixed).toContain('@declapract:review');
        expect(fixed).toContain(
          'could not derive an account-scoped `deploymentBucketByStage`',
        );
        // still no invented map (the base is unknowable) — the marker is the deliverable, not a guess
        expect(fixed).not.toContain('deploymentBucketByStage:\n');
      });
    },
  );

  given(
    'a legacy sls.yaml whose accessByStage block lacks the anchored access: line (orphan-ref guard)',
    () => {
      // caller-without-callee guard: `withAccessByStage` runs before `withDeploymentBucketByStage`
      // in the fold, so a consumer that already holds an `accessByStage:` map idempotent-skips that
      // transform, and the canonical `access: ${self:custom.accessByStage...}` line the map-insert
      // anchors on stays absent. the guard then soft-skips rather than rewrites the `deploymentBucket:`
      // ref against an absent map — an orphan `${self:custom.deploymentBucketByStage...}` reference
      // never lands (it would fail serverless variable resolution at deploy).
      const example = `
service: svc-handedited-access

custom:
  accessByStage:
    dev: prep
    prep: prep
    prod: prod
  access: prep # hand-edited to a literal, not the \${self:custom.accessByStage...} form the anchor reads

provider:
  name: aws
  stage: \${opt:stage}
  deploymentBucket: serverless-deployment-orders-\${self:provider.stage}
      `.trim();
      then('it soft-skips: no orphan deploymentBucketByStage ref when the map insert missed', async () => {
        const fixed = (await fix(example, {} as any)).contents ?? '';
        // teeth: drop the `!withMap.includes('deploymentBucketByStage:')` guard -> the ref rewrite
        // fires against an absent map and this reddens (an orphan self-ref lands)
        expect(fixed).not.toContain('deploymentBucketByStage:');
        expect(fixed).not.toContain(
          'deploymentBucket: ${self:custom.deploymentBucketByStage',
        );
        expect(fixed).toContain(
          'deploymentBucket: serverless-deployment-orders-${self:provider.stage}',
        );
      });
      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const once = await fix(example, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });
    },
  );

  given(
    'a sls.yaml checked out with crlf line endings (r10/r11 crlf non-convergence)',
    () => {
      // r10/r11 hazard, flagged since i001 and deferred every round: every transform anchors on a
      // literal `\n` (`environment:\n    NODE_ENV:`, the insert regexes, …), so a consumer checked
      // out with crlf holds `\r\n` and every anchor misses — each transform soft-skips and
      // `declapract plan` stays RED forever with no diagnostic. withUnixNewlines runs first in the
      // fold and converts crlf -> lf, so every anchor matches and the file converges to the
      // lf-canonical template in one fix.
      const crlf = [
        'service: svc-crlf',
        '',
        'provider:',
        '  name: aws',
        '  stage: ${opt:stage}',
        '  environment:',
        '    NODE_ENV: production',
        '    STAGE: ${self:provider.stage} # the deploy stage',
        '    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true',
      ].join('\r\n');

      then('the declared blocks land despite crlf input (anchors converge on lf)', async () => {
        // teeth: drop withUnixNewlines from the fold -> every one of these reddens, because the
        // crlf `\r\n` bytes make every `\n`-anchored transform soft-skip.
        const fixed = (await fix(crlf, {} as any)).contents ?? '';
        expect(fixed).toContain('accessByStage:');
        expect(fixed).toContain('variablesResolutionMode: 20210326');
        expect(fixed).toContain('ACCESS:');
        expect(fixed).not.toContain('STAGE: ${self:provider.stage}');
      });

      then('the output holds no crlf bytes (converged to lf-canonical)', async () => {
        const fixed = (await fix(crlf, {} as any)).contents ?? '';
        expect(fixed).not.toContain('\r\n');
      });

      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const once = await fix(crlf, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });
    },
  );

  given(
    'a legacy serverless.yml — the full composed fix (snapshot + idempotency)',
    () => {
      // a pristine "old" serverless.yml that trips many of the 15 chained transformers at once: old
      // runtime, deprecated plugins, #{AWS::*} pseudo-vars, ## comment headers, absent TZ +
      // connection-reuse, a stageToNodeEnvMapping NODE_ENV, timeout: 10, absent
      // variablesResolutionMode + accessByStage, ssm:GetParameters-only, and the obsolete
      // iam:ListAccountAliases access-inference grant.
      // .why = the decomposition into 15 with* functions has a real composed output; a full-output
      //        snapshot + a fix(fix(x))===fix(x) case is the regression net that catches byte-level
      //        drift across the whole chain (the pattern used 4x elsewhere this round), which
      //        targeted .toContain assertions alone cannot.
      const legacy = `
service: svc-orders # orders domain service

plugins:
  - serverless-offline # local invoke for dev
  - serverless-pseudo-parameters # obsolete once native vars land
  - serverless-prune-plugin

provider:
  name: aws
  runtime: nodejs18.x
  memorySize: 1024
  timeout: 10
  stage: \${opt:stage}
  environment:
    NODE_ENV: \${self:custom.stageToNodeEnvMapping.\${self:provider.stage}}
  deploymentBucket: serverless-deployment-\${self:provider.stage}
  iamRoleStatements:
    ## paramstore access
    - Effect: Allow
      Action: 'ssm:GetParameters'
      Resource: arn:aws:ssm:#{AWS::Region}:#{AWS::AccountId}:parameter/*
    # allow inferring access from account alias
    - Effect: Allow
      Action:
        - iam:ListAccountAliases
      Resource: '*'
    ## allow invocation of other lambdas
    - Effect: Allow
      Action:
        - lambda:InvokeFunction
      Resource: '*'
    `.trim();

      then('the legacy input matches snapshot (before)', () => {
        expect(legacy).toMatchSnapshot('legacy serverless.yml — before');
      });

      then('the full composed fix matches snapshot (after)', async () => {
        const fixed = await fix(legacy, {} as any);
        expect(fixed.contents).toMatchSnapshot('legacy serverless.yml — after');
      });

      then('a second apply is a no-op (fix(fix(x)) === fix(x))', async () => {
        const once = await fix(legacy, {} as any);
        const twice = await fix(once.contents!, {} as any);
        expect(twice.contents).toEqual(once.contents);
      });

      then('the composed fix trips the expected transformers', async () => {
        const fixed = (await fix(legacy, {} as any)).contents ?? '';
        // a spot-check across the chain, so a broken step reddens a named assertion,
        // not only the opaque snapshot diff
        expect(fixed).toContain('runtime: nodejs22.x');
        expect(fixed).not.toContain('serverless-offline');
        expect(fixed).not.toContain('serverless-pseudo-parameters ');
        expect(fixed).toContain('${aws:region}');
        expect(fixed).toContain('${aws:accountId}');
        expect(fixed).toContain('# parameter store access');
        expect(fixed).toContain('TZ: UTC');
        expect(fixed).toContain('AWS_NODEJS_CONNECTION_REUSE_ENABLED: true');
        // r7.b1 teeth: the legacy stageToNodeEnvMapping NODE_ENV is rewritten to the go-forward
        // literal, so the fix output never references a key its inserted custom: block lacks.
        expect(fixed).toContain('NODE_ENV: production');
        expect(fixed).not.toContain('stageToNodeEnvMapping');
        expect(fixed).toContain('timeout: 60');
        expect(fixed).toContain('variablesResolutionMode: 20210326');
        expect(fixed).toContain('accessByStage:');
        // the withPackageArtifact/withPrunePlugin anchor: a plugins block sits between service:
        // and provider: in this fixture, which the old service-anchored regex could not see — it
        // silently no-opped and the snapshot recorded the gap. the provider:-anchored insert now
        // fires no matter what precedes it. teeth: revert the anchor -> these redden.
        expect(fixed).toContain('package:\n  artifact: .artifact/contents.zip');
        // the prune plugin already in the file survives and is NOT duplicated (presence guard),
        // and the one plugins block is not split into two
        expect((fixed.match(/serverless-prune-plugin/g) || []).length).toBe(1);
        expect((fixed.match(/\nplugins:/g) || []).length).toBe(1);
        expect(fixed).toContain('account:GetAccountInformation');
        expect(fixed).not.toContain('iam:ListAccountAliases');
        expect(fixed).toContain('- ssm:GetParameter\n');
      });
    },
  );

  given('a legacy serverless.yml whose provider timeout is a non-default value', () => {
    // the default-timeout transform bumps a provider `timeout: 10` to `timeout: 60`. a consumer whose
    // provider timeout is some OTHER value (e.g. 30) is a deliberate operational choice — an auto-bump
    // to 60 would override it (the "a practice that emits a value" hazard). so on this shape the
    // transform emits an actionable `@declapract:review` marker instead of a silent no-op, the same
    // visibility terminus as withUtcTimezone. whether to FORCE 60 or RELAX the clamp is the
    // wisher-reserved fork (F-serverless-soft-skip-convergence).
    const example = `
service: svc-slow-fn

provider:
  name: aws
  runtime: nodejs22.x
  timeout: 30
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
    `.trim();

    then('a non-default provider timeout emits a review marker, not a silent no-op', async () => {
      const fixed = (await fix(example, {} as any)).contents ?? '';
      // teeth: drop the non-default marker branch -> this reddens (a `timeout: 30` would then
      // soft-skip silently and CONTAINS(`timeout: 60`) stays red with NO diagnostic — the row-1
      // non-convergent-silent class the wish forbids)
      expect(fixed).toContain('@declapract:review');
      expect(fixed).toContain('provider `timeout:` is not the 60s default');
      // it does NOT override the consumer's deliberate value (the wisher-reserved fork)
      expect(fixed).toContain('timeout: 30');
      expect(fixed).not.toContain('timeout: 60\n');
    });

    then('a second apply is a no-op (the marker is idempotent)', async () => {
      const once = await fix(example, {} as any);
      const twice = await fix(once.contents!, {} as any);
      expect(twice.contents).toEqual(once.contents);
    });

    then('a four-space function-level timeout: 100 is NOT clobbered by the two-space anchor', async () => {
      const withFnTimeout = `
service: svc-fn-timeout

provider:
  name: aws
  runtime: nodejs22.x
  timeout: 60
  stage: \${opt:stage}

functions:
  slowOne:
    handler: src/handler.slowOne
    timeout: 100
      `.trim();
      const fixed = (await fix(withFnTimeout, {} as any)).contents ?? '';
      // the provider default (60) idempotent-skips; the function-level 100 (four-space) is untouched
      expect(fixed).toContain('    timeout: 100');
      expect(fixed).not.toContain('@declapract:review');
    });
  });

  given(
    'the fix output converges with the real template under CONTAINS (r11 i067 b1)',
    () => {
      // r11 i067 blocker (arch-defects): declapract governs this file with CONTAINS, which runs
      // `expect(foundContents).toContain(declaredFileContents)` — the WHOLE hydrated template as one
      // contiguous span (the check-contains source + containsCheck, verified in node_modules/declapract).
      // so a migrated consumer's fix output must reproduce the template's accessByStage +
      // deploymentBucketByStage prose VERBATIM, or the toContain match fails and `declapract plan`
      // stays red forever — a non-convergent fix, the row-1 class the wish forbids. no prior test
      // round-trips fix() output against the real template; this clamp does, with no third copy of the
      // prose: it lifts the template's own `custom:` region + deploymentBucket ref and asserts the fix
      // reproduces each byte-for-byte. a reword of EITHER the template or the fix reddens CI here,
      // rather than a migrated consumer's plan.
      const template = readFileSync(
        join(__dirname, 'best-practice', 'serverless.yml'),
        'utf-8',
      );
      // hydrate the one placeholder the two blocks carry to a known namespace, so the bucket base the
      // fix derives from the consumer line (`serverless-deployment-orders`) equals the template base.
      const hydrated = template.replace(
        /@declapract\{variable\.infrastructureNamespaceId\}/g,
        'orders',
      );
      const example = `
service: svc-orders

provider:
  name: aws
  stage: \${opt:stage}
  environment:
    NODE_ENV: production
  deploymentBucket: serverless-deployment-orders-\${self:provider.stage}
      `.trim();

      then(
        'the fix reproduces the template custom: region (accessByStage + deploymentBucketByStage) as a contiguous span',
        async () => {
          const fixed = (await fix(example, {} as any)).contents ?? '';
          const customRegion = hydrated.slice(
            hydrated.indexOf('custom:'),
            hydrated.indexOf('\nprovider:'),
          );
          // teeth: reword any comment in the template accessByStage/deploymentBucketByStage block, or
          // in the fix's accessByStageCustom / withDeploymentBucketByStage emit, and this reddens.
          expect(fixed).toContain(customRegion);
        },
      );

      then(
        'the fix reproduces the template deploymentBucket reference line byte-for-byte',
        async () => {
          const fixed = (await fix(example, {} as any)).contents ?? '';
          const bucketRef = hydrated
            .split('\n')
            .find((line) => line.trimStart().startsWith('deploymentBucket:'));
          expect(bucketRef).toBeDefined();
          expect(fixed).toContain(bucketRef!);
        },
      );
    },
  );
});
