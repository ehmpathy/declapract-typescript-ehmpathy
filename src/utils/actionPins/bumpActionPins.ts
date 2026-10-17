import { execFileSync } from 'node:child_process';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ConstraintError } from 'helpful-errors';

import { getAllPathsUnderDir } from '../getAllPathsUnderDir';
import { asActionPinTargetTag } from './asActionPinTargetTag';

/**
 * .what = re-reads every sha-pinned action ref on both github surfaces and moves each pin to the
 *         newest commit inside its pinned major (#556)
 * .why  = the workflow templates are delivered by EQUALS, so a consumer cannot bump a pin — the
 *         next apply reverts it. the bump must happen here, at the source. this is the command the
 *         scheduled `bump-action-pins.yml` runs; a human may run it too
 * .how  = node -r esbuild-register src/utils/actionPins/bumpActionPins.ts [--mode plan|apply]
 *           - plan (default) prints each bump and writes no file
 *           - apply rewrites `@<sha.old> # <tag.old>` → `@<sha.new> # <tag.new>` in every file
 *             under `src/practices` and `.github`, which is the same two-glob procedure the
 *             actionPins clamp documents; then re-record its pin table and read the diff
 * .note = an annotated tag's ref names a tag OBJECT, not a commit. each ref is dereferenced when
 *         `.object.type` reads `tag`, or the pin would name no commit and github would reject it
 */

const REPO_ROOT = join(__dirname, '..', '..', '..');
const SURFACES = [join(REPO_ROOT, 'src/practices'), join(REPO_ROOT, '.github')];

interface ActionPin {
  repo: string;
  sha: string;
  tag: string;
}

interface TagRef {
  ref: string;
  object: { sha: string; type: string };
}

/**
 * .what = the unique pins named across a set of texts
 * .why  = a pin is `uses: <owner>/<repo>[/<path>]@<40-hex> # <tag>`; the subpath folds into its repo
 */
const ACTION_PIN_PATTERN =
  /uses:\s*(?<repo>[\w.-]+\/[\w.-]+)(?:\/[\w./-]+)?@(?<sha>[0-9a-f]{40})\s+#\s*(?<tag>\S+)/g;
const asActionPinsFromTexts = (input: { texts: string[] }): ActionPin[] => {
  // each group is required by the pattern, so a match always carries all three
  const found = input.texts.flatMap((text) =>
    [...text.matchAll(ACTION_PIN_PATTERN)].map((match) => ({
      repo: match.groups!.repo!,
      sha: match.groups!.sha!,
      tag: match.groups!.tag!,
    })),
  );
  return [
    ...new Map(found.map((pin) => [`${pin.repo}@${pin.sha}#${pin.tag}`, pin])).values(),
  ].sort((a, b) => a.repo.localeCompare(b.repo));
};

/**
 * .what = every file under the two surfaces, save installed modules
 */
const getAllSurfacePaths = (): string[] =>
  SURFACES.flatMap((dir) => getAllPathsUnderDir({ dir, skip: ['node_modules'] }));

/**
 * .what = the workflow and action yaml under the two surfaces, outside fixture dirs
 * .why  = the pins to re-read live in real templates; a fixture holds stale refs on purpose
 */
const getAllWorkflowPaths = (): string[] =>
  getAllSurfacePaths()
    .filter((path) => /\/\.github\/(workflows|actions)\//.test(path))
    .filter((path) => /\.ya?ml$/.test(path))
    .filter((path) => !/\/(__snapshots__|\.test)\//.test(path));

/**
 * .what = a gh api read, parsed as json
 */
const getGhApiJson = (input: { route: string }): unknown =>
  JSON.parse(execFileSync('gh', ['api', '-X', 'GET', input.route], { encoding: 'utf-8' }));

/**
 * .what = the tag refs a repo publishes under a prefix
 */
const getAllTagRefs = (input: { repo: string; prefix: string }): TagRef[] =>
  getGhApiJson({
    route: `repos/${input.repo}/git/matching-refs/tags/${input.prefix}`,
  }) as TagRef[];

/**
 * .what = the commit a tag ref names, with an annotated tag dereferenced
 */
const getOneCommitShaForTagRef = (input: { repo: string; tagRef: TagRef }): string => {
  if (input.tagRef.object.type === 'commit') return input.tagRef.object.sha;
  const tagObject = getGhApiJson({
    route: `repos/${input.repo}/git/tags/${input.tagRef.object.sha}`,
  }) as { object: { sha: string; type: string } };
  return tagObject.object.sha;
};

/**
 * .what = the pin a repo should hold now, inside its pinned major
 */
const getOneActionPinTarget = (input: { pin: ActionPin }): ActionPin => {
  const prefix = /^(v?\d+)/.exec(input.pin.tag)?.[1] ?? input.pin.tag;
  const tagRefs = getAllTagRefs({ repo: input.pin.repo, prefix });
  const tagsAvailable = tagRefs.map((tagRef) => tagRef.ref.replace(/^refs\/tags\//, ''));
  const tag = asActionPinTargetTag({ tagPinned: input.pin.tag, tagsAvailable });
  const tagRef = tagRefs.find((row) => row.ref === `refs/tags/${tag}`);
  if (!tagRef)
    throw new ConstraintError('the pinned tag is absent upstream', {
      repo: input.pin.repo,
      tag,
      hint: 'repin this action by hand to a tag that exists',
    });
  return { repo: input.pin.repo, tag, sha: getOneCommitShaForTagRef({ repo: input.pin.repo, tagRef }) };
};

/**
 * .what = rewrite one pin across every file of both surfaces; returns the files it touched
 * .note = each file is written to a temp file beside it, then renamed over the original, so an
 *         interrupted write leaves the file wholly old or wholly new. a run cut short between files
 *         converges on the next run, since targets are re-derived from the text each time
 */
const setActionPinAcrossSurfaces = (input: { from: ActionPin; into: ActionPin }): string[] => {
  const needle = `@${input.from.sha} # ${input.from.tag}`;
  const replacement = `@${input.into.sha} # ${input.into.tag}`;
  return getAllSurfacePaths().flatMap((path) => {
    const text = readFileSync(path, 'utf-8');
    if (!text.includes(needle)) return [];
    const pathTemp = `${path}.bump.tmp`;
    writeFileSync(pathTemp, text.split(needle).join(replacement));
    renameSync(pathTemp, path);
    return [relative(REPO_ROOT, path)];
  });
};

/**
 * .what = the bump procedure: read pins, find targets, report, and in apply mode rewrite
 * .why  = one call moves every sha-pinned action to the newest tag inside its pinned major, across
 *         the workflows and the practice templates alike, so the two surfaces never drift apart
 */
export const bumpActionPins = (input: { mode: 'plan' | 'apply' }): { bumps: number } => {
  const pins = asActionPinsFromTexts({
    texts: getAllWorkflowPaths().map((path) => readFileSync(path, 'utf-8')),
  });
  console.log(`🐚 bumpActionPins --mode ${input.mode}`);
  console.log(`   ├─ pins: ${pins.length}`);

  const bumps = pins
    .map((pin) => ({ from: pin, into: getOneActionPinTarget({ pin }) }))
    .filter((row) => row.from.sha !== row.into.sha || row.from.tag !== row.into.tag);

  bumps.forEach((row) => {
    console.log(
      `   ├─ ${row.from.repo}: ${row.from.tag} ${row.from.sha.slice(0, 7)} → ${row.into.tag} ${row.into.sha.slice(0, 7)}`,
    );
    if (input.mode !== 'apply') return;
    setActionPinAcrossSurfaces(row).forEach((path) => console.log(`   │  └─ ${path}`));
  });

  console.log(`   └─ bumps: ${bumps.length}${input.mode === 'apply' ? '' : ' (plan; no file written)'}`);
  return { bumps: bumps.length };
};

// run as a command
if (require.main === module) {
  const modeArg = process.argv[process.argv.indexOf('--mode') + 1];
  const mode = process.argv.includes('--mode') ? modeArg : 'plan';
  if (mode !== 'plan' && mode !== 'apply')
    throw new ConstraintError('--mode must be plan or apply', { mode });
  bumpActionPins({ mode });
}
