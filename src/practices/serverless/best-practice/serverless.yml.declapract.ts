import type { FileFixFunction } from 'declapract';
import { FileCheckType } from 'declapract';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)

// .note = ON A MISS, EVERY TRANSFORM SOFT-SKIPS (returns the contents unchanged); none throws.
//   a soft-skip is NOT a silent break: the overall check is CONTAINS, so any declared line a
//   transform could not land is absent from the output, which leaves `declapract plan` RED — that
//   red IS the signal. a throw was the wrong mechanism for a miss: `fix` folds 14 transforms, so
//   one throw aborts the whole chain and a very common arrival shape (a var before NODE_ENV, a
//   pre-extant custom: block, an underscore in the service name) then blocks every unrelated repair
//   — the runtime bump, the plugin removal, the IAM grants — from landing at all. CONTAINS already
//   supplies the visibility a throw reached for, without that abort. the one true silent break a
//   throw once guarded — a SECOND top-level key of a section the file already holds, a yaml
//   last-wins clobber that PASSES CONTAINS — is prevented by NOT inserting when the section already
//   exists (a soft-skip that declines the duplicate), which needs no throw either.

/**
 * .what = convert crlf newlines to unix lf, as the first transform in the fold.
 * .why  = every peer transform anchors on a literal `\n` (`environment:\n    NODE_ENV:`, the insert
 *         regexes, etc.). a consumer checked out with crlf line endings holds `\r\n`, so every
 *         anchor misses and each transform soft-skips — `declapract plan` then stays RED forever,
 *         with no diagnostic that names the cause (the exact silent, compiler-invisible friction the
 *         wish exists to kill). this practice is lf-canonical: every declared line uses `\n` and the
 *         emitted output is lf, so a crlf file SHOULD converge to lf. a conversion here makes every
 *         anchor match and the file converge in one `fix`. idempotent: an lf file has no `\r\n`, so
 *         a re-run is a no-op. the CONTAINS check then passes against the now-lf output — no custom
 *         check needed, because the fix makes the file lf before the next plan reads it.
 */
const withUnixNewlines = (input: { contents: string }): string =>
  input.contents.replace(/\r\n/g, '\n');

const accessInferencePolicy = `    # allow access inference from account name
    - Effect: Allow
      Action:
        - account:GetAccountInformation
      Resource: '*'`;

// .note = these comment strings are BYTE-IDENTICAL to the template `serverless.yml` accessByStage
//   block (lines 13-16). the CONTAINS check asserts `foundContents` includes `declaredFileContents`
//   — the WHOLE hydrated template as one contiguous span (declapract's checkContainsSubstring) — so a
//   migrated consumer's fix output must reproduce the template's prose verbatim or the whole toContain
//   match fails and `declapract plan` stays red forever. the `template holds the accessByStage block`
//   clamp in the unit test reads the real template and asserts this block sits inside it, so a reword
//   of either copy reddens CI rather than a consumer's plan.
const accessByStageCustom = `custom:
  accessByStage:
    dev: prep # stage=dev deploys to $service-dev but uses ACCESS=prep (config/prep.json)
    prep: prep # stage=prep deploys to $service-prep also with ACCESS=prep; one service answers to both the -dev and -prep fleets while callers migrate
    prod: prod
  access: \${self:custom.accessByStage.\${opt:stage}, 'prep'} # the resolved access for this deploy — one source, referenced by the ACCESS env var + every access-keyed resource arn below, so a partial edit cannot re-split the stage/access axes

`;

/**
 * .what = bump the lambda runtime to the current node major.
 * .why  = an old runtime string silently deploys onto an unsupported node version.
 */
const withNodeRuntime = (input: { contents: string }): string =>
  input.contents.replace(/runtime: nodejs\d\d.x/, 'runtime: nodejs22.x');

/**
 * .what = drop the plugins serverless no longer needs.
 * .why  = serverless-offline is unused, and serverless-pseudo-parameters is obsolete
 *         (serverless supports native variables now).
 */
const withoutDeprecatedPlugins = (input: { contents: string }): string =>
  input.contents
    .replace(/ {2}- serverless-offline .*\n/, '')
    .replace(/ {2}- serverless-pseudo-parameters .*\n/, '');

/**
 * .what = rewrite the pseudo-parameter `#{AWS::*}` syntax to serverless native `${aws:*}`.
 * .why  = the native form drops the serverless-pseudo-parameters plugin dependency.
 */
const withNativeVariables = (input: { contents: string }): string =>
  input.contents
    .replace(/#\{AWS::Region\}/g, '${aws:region}')
    .replace(/#\{AWS::AccountId\}/g, '${aws:accountId}');

/**
 * .what = collapse the doubled `##` comment headers down to a single `#`.
 * .why  = a `##` header is a stray double-hash; the house style is one `#` per comment.
 */
const withSingleHashCommentHeaders = (input: { contents: string }): string =>
  input.contents
    .replace('## paramstore access', '# parameter store access')
    .replace(
      '## allow invocation of other lambdas',
      '# allow invocation of other lambdas',
    );

/**
 * .what = prepend an idempotent `# @declapract:review` marker to the file when a NODE_ENV-anchored
 *         env insert could not land (an `environment:` block exists, but NODE_ENV is not its first
 *         key, so the positional anchor missed). the marker NAMES the line to add + why the
 *         auto-insert declined, so a red `declapract plan` carries an actionable diagnostic.
 * .why  = a bare soft-skip leaves CONTAINS red with the declared line absent but NO signal about
 *         WHICH arrival shape failed — a consumer whose env block puts a var before NODE_ENV sees
 *         only "line missing", not "your NODE_ENV is not first, so the anchor missed". this marker
 *         closes that ergonomic gap with the same `@declapract:review` vocabulary withInsertOnceBefore
 *         uses. a top-of-file comment is indent-safe (a nested `environment:` block has an unknown
 *         indent in an arbitrary consumer) and cannot disturb any peer transform's anchor.
 * .note = fires ONLY when an `environment:` block is present (the miss is a key-order shape, not an
 *         absent block); with no env block there is no shape to converge, so CONTAINS-red naming the
 *         absent line is signal enough. idempotent (guards on the marker's presence). a residual
 *         marker may persist after a consumer hand-fixes their key order; it is a one-line comment a
 *         consumer removes on merge, never a re-inserted or duplicated line.
 * .note = converging MORE arrival shapes (inject as first env child regardless of key order) is the
 *         tracked follow-on `.dream/v2026_09_10.fix.serverless-soft-skip-convergence.md`; this marker
 *         is the running-consumer diagnostic that follow-on's convergence has not yet delivered.
 */
const withEnvInsertReviewMarker = (input: {
  contents: string;
  need: string;
}): string => {
  // no environment block at all → no shape to converge; CONTAINS-red already names the absent line
  if (!input.contents.includes('environment:')) return input.contents;
  const marker = `# @declapract:review — could not auto-insert \`${input.need}\` under \`environment:\` because NODE_ENV is not the block's first key (the positional anchor missed); add \`${input.need}\` as a child of your \`environment:\` block by hand — the failing \`declapract plan\` diff names it.`;
  // idempotent: the marker is already present, so a re-run is a no-op
  if (input.contents.includes(marker)) return input.contents;
  return `${marker}\n${input.contents}`;
};

/**
 * .what = declare `TZ: UTC` in the function environment, above `NODE_ENV`.
 * .why  = an explicit utc timezone is a pit of success against date drift across regions.
 * .note = idempotent skip when `TZ: UTC` is already declared. on the primary shape the `.replace`
 *         lands the line; on any OTHER shape (env block present, NODE_ENV not first) it emits a
 *         `@declapract:review` marker naming the shape to converge, so the still-red CONTAINS plan
 *         carries a diagnostic rather than a bare missing-line. a throw here would abort the 16 peer
 *         transforms; the marker does not.
 */
const withUtcTimezone = (input: { contents: string }): string => {
  // idempotent skip: the timezone is already declared
  if (input.contents.includes('TZ: UTC')) return input.contents;

  // primary anchor: NODE_ENV is the first key under the env block
  if (input.contents.includes('environment:\n    NODE_ENV:'))
    return input.contents.replace(
      'environment:\n    NODE_ENV:',
      'environment:\n    TZ: UTC # guarantee that utc timezone will be used explicitly, to facilitate a pit of success\n    NODE_ENV:',
    );

  // anchor missed: emit an actionable diagnostic marker (not a silent no-op), CONTAINS stays red
  return withEnvInsertReviewMarker({
    contents: input.contents,
    need: 'TZ: UTC',
  });
};

/**
 * .what = enable aws-sdk connection reuse in the function environment.
 * .why  = connection reuse cuts cold-start latency; see the aws-sdk-for-javascript guide.
 * .note = idempotent skip when the flag is already declared. on the primary shape the `.replace`
 *         lands the flag; on any OTHER shape (env block present, this NODE_ENV form absent) it emits
 *         a `@declapract:review` marker naming the flag to add, so the still-red CONTAINS plan
 *         carries a diagnostic rather than a bare missing-line. this anchor is the legacy NODE_ENV
 *         form, so it runs BEFORE `withNodeEnvProduction` rewrites that value.
 * .note = the anchor is the NODE_ENV line ALONE, not a NODE_ENV+deploymentBucket pair. an earlier
 *         anchor required `deploymentBucket` on the very next line as a positional marker for the
 *         env-block boundary — but that coupled the flag's insert to a line this transform does not
 *         own, so a legacy consumer whose environment block is NOT directly succeeded by
 *         `deploymentBucket` (it sits elsewhere, or the consumer has none) never landed the flag and
 *         stayed CONTAINS-red forever with no diagnostic — a non-convergent fix (the row-1 class the
 *         wish forbids). the insert fixes its own indent (`\n    ` = env level), so the boundary
 *         marker was never needed; an anchor on NODE_ENV alone converges every legacy shape. the
 *         later `withNodeEnvProduction` rewrites the same NODE_ENV line by regex on its own line, so
 *         a flag inserted on the next line does not disturb that rewrite.
 */
const withConnectionReuse = (input: { contents: string }): string => {
  // idempotent skip: the flag is already declared
  if (input.contents.includes('AWS_NODEJS_CONNECTION_REUSE_ENABLED'))
    return input.contents;

  // primary anchor: the legacy NODE_ENV line (runs BEFORE withNodeEnvProduction rewrites it)
  if (
    input.contents.includes(
      'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}',
    )
  )
    return input.contents.replace(
      'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}',
      'NODE_ENV: ${self:custom.stageToNodeEnvMapping.${self:provider.stage}}\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html',
    );

  // go-forward anchor: a consumer already on the literal `NODE_ENV: production` line that lacks the
  // flag (e.g. it was hand-edited out, or the value was rewritten before this file gained the flag)
  // converges here rather than a marker-only red plan — the flag lands on the next line, and any
  // comment after `production` is preserved. this closes the go-forward non-convergence shape.
  if (/NODE_ENV: production/.test(input.contents))
    return input.contents.replace(
      /NODE_ENV: production([^\n]*)/,
      'NODE_ENV: production$1\n    AWS_NODEJS_CONNECTION_REUSE_ENABLED: true # https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html',
    );

  // anchor missed: emit an actionable diagnostic marker (not a silent no-op), CONTAINS stays red
  return withEnvInsertReviewMarker({
    contents: input.contents,
    need: 'AWS_NODEJS_CONNECTION_REUSE_ENABLED: true',
  });
};

/**
 * .what = rewrite a legacy `NODE_ENV: ${self:custom.stageToNodeEnvMapping.${...stage}}` to the
 *         go-forward literal `NODE_ENV: production`.
 * .why  = the template's go-forward NODE_ENV is the literal `production` (prep and prod run the same
 *         production code paths). a legacy file that references `custom.stageToNodeEnvMapping` while
 *         the fix inserts a `custom:` block holding only `accessByStage` would deploy-fail (the
 *         emitted custom: block never declares stageToNodeEnvMapping) AND fail its own CONTAINS
 *         check (which requires `NODE_ENV: production`). rewrite the value so the fix converges to
 *         the template and never emits a reference to a key it does not supply. runs AFTER
 *         withConnectionReuse, which anchors on the legacy form. a file already on
 *         `NODE_ENV: production` is a no-op.
 */
const withNodeEnvProduction = (input: { contents: string }): string =>
  input.contents.replace(
    /NODE_ENV: \$\{self:custom\.stageToNodeEnvMapping\.\$\{self:provider\.stage\}\}[^\n]*/,
    'NODE_ENV: production # deploy with production optimizations of all resources, to make `prep` and `prod` stage deployments equivalent functionally (i.e., the same code paths in prep and prod)',
  );

/**
 * .what = insert a `block` at `anchor` exactly once. skipped when `guard` is already present, or
 *         (when `section` is given) when that top-level key already sits in the file under other
 *         content, or when no `anchor` matches. every skip is a soft return of the contents
 *         unchanged.
 * .why  = every "add a top-level block if absent" transformer shares this one shape. one audited
 *         implementation is safer than many hand-derived anchor/guard pairs. the `guard`
 *         presence-check makes each caller idempotent on a re-apply. the `section` soft-skip
 *         forecloses a silent-break class: a `guard` that checks only DECLARED CONTENT would insert
 *         a whole `package:` / `plugins:` / `custom:` block even when the consumer's legacy file
 *         already holds that top-level key under DIFFERENT content — a yaml last-wins clobber that
 *         silently drops the consumer's block while CONTAINS still passes (the declared lines are
 *         present, once). declining to insert a second key of a section the file already holds
 *         prevents that clobber, and CONTAINS (which requires the declared block) surfaces the
 *         needed manual merge as a red plan. an anchor miss returns the contents unchanged too;
 *         CONTAINS surfaces the un-inserted block. no throw, so a single miss never aborts the fold.
 */
export const withInsertOnceBefore = (input: {
  contents: string;
  guard: string;
  anchor: string | RegExp;
  insert: string;
  section?: string;
}): string => {
  // idempotent skip: the block is already declared, so re-insert is a no-op
  if (input.contents.includes(input.guard)) return input.contents;

  // soft-skip on a pre-extant section this insert does not own — but NOT silently. a content-only
  // guard would insert a second top-level `${section}:` key here, and yaml last-wins would drop the
  // consumer's block, so the duplicate is declined. rather than return the contents unchanged (a
  // silent stall a consumer cannot diagnose — CONTAINS-red names the absent key, not the reason),
  // inject an idempotent `@declapract:review` marker on the line above the extant section. that
  // makes `declapract plan` show an actionable diff naming the hand-merge, while CONTAINS stays red
  // until the declared keys are merged. the marker uses the wish's own review-marker vocabulary.
  if (
    input.section &&
    new RegExp(`(^|\\n)${input.section}:`).test(input.contents)
  ) {
    const marker = `# @declapract:review — a \`${input.section}:\` block is already present; merge the declared \`${input.section}\` keys (from the failing \`declapract plan\` diff) into your extant \`${input.section}:\` block by hand — auto-insert was declined to avoid a yaml last-wins clobber that would drop your block.`;
    // idempotent: the marker is already present, so a re-run is a no-op
    if (input.contents.includes(marker)) return input.contents;
    // insert the marker immediately above the extant section
    return input.contents.replace(
      new RegExp(`(^|\\n)(${input.section}:)`),
      `$1${marker}\n$2`,
    );
  }

  // soft-skip on an anchor miss: a no-op .replace returns the contents unchanged (insert always
  // adds bytes, so an unchanged result can only mean the anchor did not match). CONTAINS requires
  // the declared block, so a missed anchor leaves `plan` red — the signal, without a chain abort.
  return input.contents.replace(input.anchor, input.insert);
};

/**
 * .what = insert the `package:` artifact block immediately before `provider:`, once.
 * .why  = anchor on `provider:` — a required, singular top-level key — so the insert holds no
 *         matter what sits between `service:` and `provider:` (a `plugins:` / `custom:` block is a
 *         common legacy layout). an earlier anchor that required `provider:` within one blank line
 *         of `service:` silently no-opped when any block sat between them.
 * .why  = `section: 'package'` — a legacy file may already hold a `package:` block under other
 *         keys (`individually:`, `patterns:`). the section soft-skip declines to insert a second
 *         `package:` key (a yaml last-wins clobber); CONTAINS surfaces the merge.
 */
export const withPackageArtifact = (input: { contents: string }): string =>
  withInsertOnceBefore({
    contents: input.contents,
    guard: 'artifact: .artifact/contents.zip',
    section: 'package',
    anchor: /\nprovider:/,
    insert: '\npackage:\n  artifact: .artifact/contents.zip\n\nprovider:',
  });

/**
 * .what = add a `plugins: [serverless-prune-plugin]` block before `provider:`, once.
 * .why  = prune keeps only recent function versions, to stay under the code-storage cap. anchor on
 *         `provider:` (the same structural anchor the 3 peer inserts use) — NOT on the byte sequence
 *         `withPackageArtifact` emits. an earlier anchor keyed on `  artifact: …\n\nprovider:`
 *         coupled this insert to a peer's literal output, so any other `package:` key after
 *         `artifact:` (a common `individually:` / `patterns:`) silently defeated it. the `guard`
 *         skips insertion when the plugin is already declared anywhere — a legacy `plugins:` block
 *         that survives `withoutDeprecatedPlugins` may already hold it.
 * .why  = `section: 'plugins'` — a legacy file may hold a `plugins:` block with a DIFFERENT plugin
 *         (esbuild/webpack) and no prune plugin. the section soft-skip declines to insert a second
 *         `plugins:` key (a yaml last-wins clobber of the consumer's plugin); CONTAINS surfaces it.
 */
export const withPrunePlugin = (input: { contents: string }): string =>
  withInsertOnceBefore({
    contents: input.contents,
    guard: '- serverless-prune-plugin',
    section: 'plugins',
    anchor: /\nprovider:/,
    insert: '\nplugins:\n  - serverless-prune-plugin\n\nprovider:',
  });

/**
 * .what = bump the default provider timeout from 10s to 60s.
 * .why  = a 1min default is resilient against increased cold-start times; individual
 *         functions can still override it.
 * .note = the anchor is line-start + exactly two-space indent (`^  timeout:`), which targets the
 *         PROVIDER-level timeout only — a function-level `    timeout:` sits at four-space indent
 *         and never matches. this also forecloses a subsegment clobber: a raw `.replace('  timeout: 10')`
 *         would match the last two spaces of a four-space `    timeout: 100` and corrupt it.
 * .note = on the primary shape (provider `timeout: 10`) the line converges to `timeout: 60`. on a
 *         provider timeout at any OTHER value it emits a `@declapract:review` marker rather than an
 *         override of a deliberate operational choice — the same visibility terminus as `withUtcTimezone`.
 *         whether the practice should FORCE 60 over a consumer's explicit value, or RELAX the
 *         `timeout: 60` CONTAINS clamp, is a design decision reserved to the wisher
 *         (`inventory.of=fulcrums.case=F-serverless-soft-skip-convergence`); the marker makes the
 *         still-red plan actionable and does not pick that fork.
 */
const withProviderTimeoutReviewMarker = (input: {
  contents: string;
}): string => {
  const marker =
    '# @declapract:review — provider `timeout:` is not the 60s default and could not be auto-bumped, because a non-default value is a deliberate operational choice; set provider `timeout: 60` (individual functions can still override it) or relax the requirement by hand — the red `declapract plan` diff names the `timeout: 60` line.';
  // idempotent: the marker is already present, so a re-run is a no-op
  if (input.contents.includes(marker)) return input.contents;
  return `${marker}\n${input.contents}`;
};

const withDefaultTimeout = (input: { contents: string }): string => {
  // idempotent skip: the 60s provider default is already declared
  if (/^ {2}timeout: 60\b/m.test(input.contents)) return input.contents;

  // primary anchor: the legacy 10s provider default (two-space indent = provider level)
  if (/^ {2}timeout: 10\b/m.test(input.contents))
    return input.contents.replace(
      /^ {2}timeout: 10\b.*$/m,
      '  timeout: 60 # default timeout to 1min, for resilience against increased cold start times; individual functions can override this',
    );

  // a provider timeout at some OTHER value → emit an actionable diagnostic, not a silent no-op;
  //   CONTAINS stays red and the marker names the shape to converge (the wisher-reserved fork)
  if (/^ {2}timeout: \d+/m.test(input.contents))
    return withProviderTimeoutReviewMarker({ contents: input.contents });

  // no provider timeout at all → CONTAINS-red already names the absent line
  return input.contents;
};

/**
 * .what = insert `variablesResolutionMode:` after the `service:` line, if absent.
 * .why  = the service line may carry an inline comment; `[^\n]*` captures it into `$1` and
 *         preserves it. the name class is `\S[^\n]*` so ANY legal service name matches — an
 *         underscore (`svc_orders`) or a dotted name converges rather than soft-skips.
 */
const withVariablesResolutionMode = (input: { contents: string }): string =>
  withInsertOnceBefore({
    contents: input.contents,
    guard: 'variablesResolutionMode:',
    anchor: /^(service: \S[^\n]*)\n/m,
    insert: '$1\n\nvariablesResolutionMode: 20210326\n',
  });

/**
 * .what = insert the `custom.accessByStage` block before `provider:`, if absent.
 * .why  = the block maps BOTH non-prod deploy stages to the `prep` access (see the north-star
 *         axis-collapse): `dev → prep` (the ancient slug) AND `prep → prep` (the contemp slug), so
 *         self dual-publishes the dev+prep fleets and both read `ACCESS=prep`. absent it, an
 *         access-keyed lookup has no stage bridge.
 * .note = TIER-C SCAFFOLD — this stage↔access bridge is transition-only, and the `prep: prep`
 *         dual-publish key is the transition mechanism itself. once the north-star axis-collapse
 *         retires the divergent `stage` (grep AccessAncient → 0 org-wide), the ancient `dev → prep`
 *         entry, the `-dev-` publish, and this whole transformer are DELETED — only the single
 *         access slug remains. it reads as a tidy permanent function on purpose (the decomposition
 *         named it clearly), but it is scaffold scheduled for removal, not settled design.
 * .why  = `section: 'custom'` — a real consumer commonly already holds a `custom:` block. this
 *         transformer emits a whole `custom:` block, so a content-only guard would insert a SECOND
 *         `custom:` key and yaml last-wins would silently drop the consumer's block. the section
 *         soft-skip declines that duplicate and CONTAINS surfaces the needed merge (add
 *         `accessByStage:` into the consumer's `custom:` block) as a red plan.
 */
export const withAccessByStage = (input: { contents: string }): string =>
  withInsertOnceBefore({
    contents: input.contents,
    guard: 'accessByStage:',
    section: 'custom',
    anchor: /\nprovider:/,
    insert: `\n${accessByStageCustom}provider:`,
  });

/**
 * .what = replace the `STAGE` env var with the `ACCESS` + `COMMIT` sdk-environment pair.
 * .why  = sdk-environment targets resources by access + commit slug, not by stage.
 * .note = TIER-C SCAFFOLD — the emitted `ACCESS` value reads through `${self:custom.access}`, the
 *         single hoisted var the `withAccessByStage` block declares (one source for the axis, so a
 *         partial edit cannot re-split it — D27). this rewrite gates on `accessByStage:` present, so
 *         it fires only once that block has landed: on a fresh consumer withAccessByStage inserts the
 *         block first (it runs earlier in the fold), then this rewrite lands the ACCESS pair against
 *         the now-declared `custom.access`; on a legacy consumer with a pre-extant `custom:` block
 *         withAccessByStage soft-skips (a review marker, no `custom.access`), so this rewrite also
 *         soft-skips rather than emit an unresolvable ref, and both land on a later pass once the
 *         human merges the block. when the axis-collapse lands, `ACCESS` derives from a single axis
 *         and this remap is removed. tracked with `withAccessByStage`.
 * .note = anchor-missed marker: a consumer whose `custom.access` HAS landed (`accessByStage:` present)
 *         but whose env block holds no `STAGE: ${self:provider.stage}` var to convert (a legacy env
 *         block that predates the STAGE var, or one hand-stripped of it) cannot land the ACCESS pair by
 *         replace. the template's CONTAINS check still REQUIRES `ACCESS:`/`COMMIT:`, so that after-state
 *         is CONTAINS-red — and, absent a diagnostic, silently so. this emits a `@declapract:review`
 *         marker naming the pair to add by hand, matching the marker-on-miss standard of
 *         withUtcTimezone / withConnectionReuse, so the still-red `plan` carries an actionable
 *         diagnostic rather than a bare missing-line. a throw would abort the peer transforms; the
 *         marker does not.
 */
const withAccessCommitEnv = (input: { contents: string }): string => {
  // idempotent / already-correct skip: the ACCESS pair is already declared. this ALSO trips on the
  // anchor-missed marker below, whose own text contains `ACCESS: ${self:custom.access}`, so a re-apply
  // over marker-injected output is a clean no-op (no second marker, no double insert).
  if (input.contents.includes('ACCESS:')) return input.contents;

  // caller-without-callee guard: the `${self:custom.access}` ref the ACCESS pair (and the marker
  // below) names is declared ONLY by the `withAccessByStage` block (which emits `accessByStage:` and
  // `access:` together). on a legacy consumer that already holds a top-level `custom:` block,
  // `withAccessByStage` soft-skipped its insert (a review marker, no `custom.access`), so emitting the
  // ref now — via a rewrite OR a marker that quotes it — would dangle. defer to the later pass once the
  // human merges the block; withAccessByStage's own marker already names that merge, so do NOT stack a
  // second one here.
  if (!input.contents.includes('accessByStage:')) return input.contents;

  // primary anchor: a legacy `STAGE: ${self:provider.stage}` env var to replace with the ACCESS pair.
  // withAccessByStage runs first in the fold, so `custom.access` is already declared to reference.
  if (input.contents.includes('STAGE: ${self:provider.stage}'))
    return input.contents.replace(
      /STAGE: \$\{self:provider\.stage\}[^\n]*/,
      'ACCESS: ${self:custom.access} # sdk-environment access, to target the correct config + resources (e.g., hit prep db -vs- prod db)\n    COMMIT: ${env:COMMIT} # sdk-environment commit slug, must be set by deploy command',
    );

  // anchor missed: no `environment:` block at all → no shape to converge; CONTAINS-red already names
  // the absent lines, and there is no env block to attach a marker to.
  if (!input.contents.includes('environment:')) return input.contents;

  // anchor missed with an env block present: `custom.access` is declared but no STAGE var exists to
  // convert. emit an actionable diagnostic naming the ACCESS/COMMIT pair to add by hand (not a silent
  // no-op), so the still-red CONTAINS `plan` self-documents the incomplete migration — consistent with
  // the sibling env-insert transforms above.
  const marker =
    '# @declapract:review — could not auto-insert `ACCESS: ${self:custom.access}` + `COMMIT: ${env:COMMIT}` under `environment:` because no `STAGE: ${self:provider.stage}` env var was present to convert; add both as children of your `environment:` block by hand — the failing `declapract plan` diff names them.';
  return `${marker}\n${input.contents}`;
};

/**
 * .what = migrate a legacy stage-keyed `deploymentBucket: <base>-${self:provider.stage}` to the
 *         account-scoped `deploymentBucketByStage` map plus a map-reference. the bucket base is
 *         DERIVED from the consumer's own extant bucket name — never a guessed value (D27/row-1).
 * .why  = the deployment bucket is ACCOUNT-scoped: a prod deploy assumes the prod-account oidc role,
 *         which holds no cross-account grant to the prep-account bucket. the legacy
 *         `-${self:provider.stage}` name resolves to a nonexistent `-prep` bucket for a prep deploy
 *         (only `-dev` and `-prod` buckets exist), so the deploy fails at bucket lookup — the exact
 *         #596 break. the map keys dev+prep to the shared prep-account `-dev` bucket and prod to the
 *         prod-account `-prod` bucket. #596 added this shape to the template + a CONTAINS clamp, but
 *         no transform emitted it, so a legacy consumer's CONTAINS check stayed RED forever with no
 *         diagnostic — a non-convergent fix (the very row-1 class the wish forbids). this transform
 *         closes that: it converges the legacy shape and stays a fixed point on the go-forward shape.
 * .note = the base is read from the consumer's own `deploymentBucket:` line (with or without a
 *         namespace segment), so the emitted names match the consumer's own convention rather than a
 *         guess. a consumer with no `deploymentBucket:` line has no base to derive, so this SOFT-SKIPS
 *         (returns unchanged) and CONTAINS surfaces the residual as a red plan — a value the fix
 *         cannot know is never invented. gated on `accessByStage:` present (the withAccessByStage
 *         block landed) so the `${self:custom.deploymentBucketByStage...}` reference never emits
 *         against a callee the fix did not also declare — the same caller-without-callee guard
 *         withAccessCommitEnv uses. runs after withAccessByStage.
 * .note = TIER-C SCAFFOLD — dev+prep share the `-dev` bucket only through the transition; once the
 *         axis-collapse retires the divergent stage (grep AccessAncient -> 0), the `dev` key and this
 *         transformer are deleted, and the one access slug names the one bucket.
 */
const withDeploymentBucketByStage = (input: { contents: string }): string => {
  // idempotent skip: the map is already declared (go-forward shape or a prior fix pass)
  if (input.contents.includes('deploymentBucketByStage:'))
    return input.contents;

  // caller-without-callee guard: the map sits in the withAccessByStage custom block and the
  // reference points at custom.deploymentBucketByStage, so absent that block neither may land
  if (!input.contents.includes('accessByStage:')) return input.contents;

  // derive the bucket base from the consumer's own legacy stage-keyed deploymentBucket line; a value
  // the fix cannot know is read, not guessed. the base is all that sits before `-${self:provider.stage}`
  // (`serverless-deployment` or `serverless-deployment-<ns>`). soft-skip when no legacy line matches.
  const legacy = input.contents.match(
    /deploymentBucket: (serverless-deployment(?:-\S+?)?)-\$\{self:provider\.stage\}[^\n]*/,
  );
  // no legacy line to derive a base from → soft-skip. two sub-cases, in step with the env-insert
  // soft-skips above (which gate on `environment:` presence):
  //   - a `deploymentBucket:` line EXISTS but does not match the legacy stage-keyed shape → the
  //     consumer has a bucket the fix cannot read, so emit an actionable review marker (not a
  //     silent no-op) so they get a named next step. a value the fix cannot know is never invented.
  //   - NO `deploymentBucket:` line at all → no base to derive, so return unchanged silently; there
  //     is no cross-account bucket to key, and CONTAINS surfaces any residual as a red plan.
  if (!legacy) {
    if (!input.contents.includes('deploymentBucket:')) return input.contents;
    const marker = `# @declapract:review — could not derive an account-scoped \`deploymentBucketByStage\` map: the \`deploymentBucket:\` line present does not match the legacy \`serverless-deployment...-\${self:provider.stage}\` shape to read the bucket base from. if this service deploys cross-account, add a \`deploymentBucketByStage\` map under \`custom:\` by hand (dev+prep -> the prep-account bucket, prod -> the prod-account bucket) — the red \`declapract plan\` diff names it.`;
    // idempotent: the marker is already present, so a re-run is a no-op
    if (input.contents.includes(marker)) return input.contents;
    return `${marker}\n${input.contents}`;
  }
  const base = legacy[1];

  // insert the deploymentBucketByStage map immediately after the hoisted `access:` line in custom
  const withMap = input.contents.replace(
    /( +access: \$\{self:custom\.accessByStage\.\$\{opt:stage\}, 'prep'\}[^\n]*\n)/,
    `$1  deploymentBucketByStage: # the deployment bucket is ACCOUNT-scoped: it must live in the account the deploy role assumes, so it is keyed by stage like accessByStage above\n    dev: ${base}-dev # prep-account bucket\n    prep: ${base}-dev # prep-account bucket, shared with the -dev fleet, so no separate -prep bucket need exist\n    prod: ${base}-prod # prod-account bucket — a prod deploy assumes the prod-account oidc role, which has no cross-account grant to the prep-account -dev bucket\n`,
  );

  // caller-without-callee guard: the `access:` anchor above may not match byte-for-byte (a
  // hand-edited or mid-migration custom block whose `access:` line differs), in which case the map
  // insert no-opped and `withMap` holds no `deploymentBucketByStage:` key. do NOT then rewrite the
  // `deploymentBucket:` ref against an absent map — that would emit an orphan
  // `${self:custom.deploymentBucketByStage...}` reference (the exact caller-without-callee class the
  // file's other transforms guard against). soft-skip; CONTAINS stays red and names the residual.
  if (!withMap.includes('deploymentBucketByStage:')) return input.contents;

  // rewrite the legacy stage-keyed reference to the map (dev+prep -> -dev bucket, prod -> -prod)
  return withMap.replace(
    /deploymentBucket: serverless-deployment(?:-\S+?)?-\$\{self:provider\.stage\}[^\n]*/,
    `deploymentBucket: \${self:custom.deploymentBucketByStage.\${opt:stage}, '${base}-dev'} # account-scoped via deploymentBucketByStage above; provision the -prod bucket in the prod account before the first prod deploy, or a prod deploy trades a cross-account-deny for an absent-bucket error`,
  );
};

/**
 * .what = swap the old `iam:ListAccountAliases` access-inference grant for
 *         `account:GetAccountInformation`, and add the grant when absent.
 * .why  = access inference from the account name is the go-forward path; the alias grant is
 *         obsolete.
 */
const withAccessInferencePolicy = (input: { contents: string }): string => {
  // swap the obsolete alias grant for the account-information grant, when present
  const withAliasSwapped = input.contents.includes('iam:ListAccountAliases')
    ? input.contents.replace(
        /# allow inferring access from account alias\n\s+- Effect: Allow\n\s+Action:\n\s+- iam:ListAccountAliases\n\s+Resource: '\*'/,
        accessInferencePolicy.trim(),
      )
    : input.contents;

  // add the grant when absent and an iamRoleStatements block exists to hold it
  const needsGrant =
    !withAliasSwapped.includes('account:GetAccountInformation') &&
    /iamRoleStatements:\s*\n/.test(withAliasSwapped);
  return needsGrant
    ? withAliasSwapped.replace(
        /iamRoleStatements:\s*\n/,
        `iamRoleStatements:\n${accessInferencePolicy}\n`,
      )
    : withAliasSwapped;
};

/**
 * .what = grant `ssm:GetParameter` alongside `ssm:GetParameters`, when only the plural exists.
 * .why  = the singular action is needed to read one param at a time; a grant of the plural
 *         alone denies it.
 * .note = handles BOTH plural shapes yaml admits — the inline `Action: 'ssm:GetParameters'` and the
 *         list-item `- ssm:GetParameters` — so a consumer on either shape converges. deliberate no-op
 *         skip when no plural grant exists. a plural present in a THIRD shape neither anchor matched
 *         soft-skips (returns unchanged); CONTAINS requires the singular grant, so that residual
 *         leaves `plan` red — the signal, without a chain abort.
 * .note = BOTH replaces are GLOBAL: a file with TWO separate ssm grant blocks (each its own Resource)
 *         augments every block, not just the first. idempotency is per-occurrence, not a
 *         whole-file early-return: a plural already preceded by its singular peer is left as-is, so
 *         `fix(fix(x)) === fix(x)` even across multiple blocks AND when one block already grants the
 *         singular while a second is plural-only (the whole-file `includes` guard could not
 *         distinguish those, so it left the second block non-convergent).
 */
const withSsmGetParameter = (input: { contents: string }): string => {
  // deliberate no-op skip: no plural grant to augment
  if (!input.contents.includes('ssm:GetParameters')) return input.contents;

  // inline form: `Action: 'ssm:GetParameters'` -> expand to a list that grants both (every match)
  const withInlineExpanded = input.contents.replace(
    /Action: 'ssm:GetParameters'/g,
    'Action:\n        - ssm:GetParameter\n        - ssm:GetParameters',
  );

  // list form: `- ssm:GetParameters` -> add the singular peer at the same indent, for EVERY block.
  // per-occurrence idempotency: a plural already preceded by its singular peer is left untouched.
  // soft-skip is implicit: a plural in a shape neither anchor matched (e.g. a double-quoted or
  // flow-sequence form) matches no regex, so .replace returns the string unchanged; CONTAINS
  // requires the singular, so `plan` stays red for that unhandled shape.
  return withInlineExpanded.replace(
    /( *)- ssm:GetParameters/g,
    (match, indent: string, offset: number, whole: string) =>
      whole.slice(0, offset).endsWith(`${indent}- ssm:GetParameter\n`)
        ? match
        : `${indent}- ssm:GetParameter\n${indent}- ssm:GetParameters`,
  );
};

// the ordered transform chain. each reads as what, not how; the fold applies them in sequence.
// withNodeEnvProduction runs after withConnectionReuse, which anchors on the legacy NODE_ENV form.
const transforms: Array<(input: { contents: string }) => string> = [
  withUnixNewlines,
  withNodeRuntime,
  withoutDeprecatedPlugins,
  withNativeVariables,
  withSingleHashCommentHeaders,
  withUtcTimezone,
  withConnectionReuse,
  withNodeEnvProduction,
  withPackageArtifact,
  withPrunePlugin,
  withDefaultTimeout,
  withVariablesResolutionMode,
  withAccessByStage,
  withAccessCommitEnv,
  withDeploymentBucketByStage,
  withAccessInferencePolicy,
  withSsmGetParameter,
];

/**
 * .what = fold an ordered chain of pure content transforms over the file contents.
 * .why  = names the fold as one intent (`withTransformsApplied`), so `fix` reads what-not-how — the
 *         reduce mechanics live HERE, inside a named transformer, rather than inline in the `fix`
 *         orchestrator where a reader must simulate the accumulator across 17 transforms.
 * .note = a pure reducer, no reassigned accumulator; each transform receives the prior transform's
 *         output. the chain ORDER matters (withConnectionReuse anchors the legacy NODE_ENV form that
 *         withNodeEnvProduction then rewrites) and is CLAMPED end-to-end: the unit suite asserts the
 *         converged post-fold shape and the `.declapract.integration.test.ts` runs the REAL
 *         executeApply, so a reorder that breaks a downstream anchor reddens CI, not prod.
 */
const withTransformsApplied = (input: {
  contents: string;
  transforms: Array<(step: { contents: string }) => string>;
}): string =>
  input.transforms.reduce(
    (acc, transform) => transform({ contents: acc }),
    input.contents,
  );

export const fix: FileFixFunction = (contents) => {
  if (!contents) return { contents }; // skip an absent file
  return { contents: withTransformsApplied({ contents, transforms }) };
};
