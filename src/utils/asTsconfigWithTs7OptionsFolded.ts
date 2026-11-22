import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { asJsoncView, type JsoncView } from './asJsoncView';
import { asTextSpliced, type TextSplice } from './asTextSpliced';
import { getJsoncCompilerOptionsSpan } from './getJsoncCompilerOptionsSpan';
import { getOneJsoncCompilerOptionString } from './getOneJsoncCompilerOptionString';
import { getOneJsoncObjectSpan } from './getOneJsoncObjectSpan';
import { isTsconfigImportsOptionDroppable } from './isTsconfigImportsOptionDroppable';

/**
 * .what = the splices that remove one entry, with its comma and, when the entry owns its line, the line.
 * .why  = keeps the file valid and its layout tidy: the comma after the entry goes with it, or, for a
 *         last entry, the comma before it; an entry alone on its line takes the line (and a comment
 *         after it on that line) with it. a last entry gives up only the comma char before it, so a
 *         comment that trails the prior entry stays on the prior line.
 */
const asSplicesToRemoveEntry = (input: {
  view: JsoncView;
  entry: { start: number; end: number };
}): TextSplice[] => {
  const shape = input.view.shape;
  const after = shape.slice(input.entry.end);
  const commaAfter = /^[ \t]*,/.exec(after);
  const end = input.entry.end + (commaAfter?.[0].length ?? 0);

  // an entry alone on its line takes the whole line
  const lineStart = shape.lastIndexOf('\n', input.entry.start - 1) + 1;
  const lineEndAt = shape.indexOf('\n', end);
  const lineEnd = lineEndAt === -1 ? shape.length : lineEndAt;
  const isAloneOnLine =
    shape.slice(lineStart, input.entry.start).trim() === '' &&
    shape.slice(end, lineEnd).trim() === '';
  if (isAloneOnLine && commaAfter)
    return [
      { start: lineStart, end: Math.min(lineEnd + 1, shape.length), text: '' },
    ];

  // a last entry gives up the comma before it instead; the shape blanks comments, so the comma
  // alone is cut, and any comment between it and the entry stays as written
  const before = shape.slice(0, input.entry.start);
  const commaBefore = commaAfter ? null : /,\s*$/.exec(before);
  const commaCut = commaBefore
    ? [{ start: commaBefore.index, end: commaBefore.index + 1, text: '' }]
    : [];
  if (isAloneOnLine && commaBefore && lineStart > 0)
    return [...commaCut, { start: lineStart - 1, end: lineEnd, text: '' }];
  const isGapBareText =
    !!commaBefore &&
    input.view.text.slice(commaBefore.index, input.entry.start).trim() === ',';
  if (isGapBareText && commaBefore)
    return [{ start: commaBefore.index, end, text: '' }];
  if (commaBefore)
    return [...commaCut, { start: input.entry.start, end, text: '' }];

  // an inline entry with a comma after it takes the spaces after that comma too
  const spaces = /^[ \t]*/.exec(shape.slice(end))?.[0].length ?? 0;
  return [{ start: input.entry.start, end: end + spaces, text: '' }];
};

/**
 * .what = a `paths` value, rewritten relative to the tsconfig dir rather than to `baseUrl`.
 * .why  = with `baseUrl` set, tsc reads each `paths` value relative to it; typescript 7 drops
 *         `baseUrl` and reads them relative to the tsconfig dir, and only with a `./` or `../` lead.
 * .note = an absolute value never read `baseUrl`, so it stays as written; `path.posix.join` would
 *         glue it onto `baseUrl` instead.
 */
const asPathValueRelativeToTsconfig = (input: {
  value: string;
  baseUrl: string;
}): string => {
  if (path.posix.isAbsolute(input.value)) return input.value;
  if (input.value.startsWith('${')) return input.value; // `${configDir}/…` already names its root
  const joined = path.posix.join(input.baseUrl, input.value);
  if (
    joined.startsWith('/') ||
    joined.startsWith('../') ||
    joined.startsWith('${')
  )
    return joined;
  return `./${joined}`;
};

/**
 * .what = the body span of `compilerOptions.paths`, or null when no `paths` block is declared.
 * .why  = the rebase and the lookup keys both edit inside it.
 */
const getPathsSpan = (input: {
  view: JsoncView;
}): { from: number; until: number } | null => {
  const within = getJsoncCompilerOptionsSpan({ view: input.view });
  if (!within) return null;
  return getOneJsoncObjectSpan({ view: input.view, key: 'paths', within });
};

/**
 * .what = the splices that rewrite every string in each `paths` array against `baseUrl`.
 * .why  = one splice per value leaves each key, its order, and any comment between values intact;
 *         null means no `paths` block, so the caller swaps `baseUrl` for a paths block instead.
 */
const asSplicesToRebasePaths = (input: {
  view: JsoncView;
  baseUrl: string;
}): TextSplice[] | null => {
  const span = getPathsSpan({ view: input.view });
  if (!span) return null;
  const body = input.view.shape.slice(span.from, span.until);
  return [...body.matchAll(/\[([^\]]*)\]/g)].flatMap((array) =>
    [...(array[1] ?? '').matchAll(/"(?:[^"\\\n]|\\.)*"/g)].map((value) => {
      const start = span.from + (array.index ?? 0) + 1 + (value.index ?? 0);
      const end = start + value[0].length;
      return {
        start,
        end,
        text: `"${asPathValueRelativeToTsconfig({ value: input.view.text.slice(start + 1, end - 1), baseUrl: input.baseUrl })}"`,
      };
    }),
  );
};

/**
 * .what = one top-level entry of the `baseUrl` dir: a dir, or a module file.
 * .why  = each is a root a bare import (`'logic/x'`, `'config'`) could name under `baseUrl`.
 */
type BaseUrlEntry = { name: string; isDirectory: boolean };

/**
 * .what = true when a `baseUrl` dir entry is a root a bare import could name.
 * .why  = no module imports a dot entry, `node_modules`, a `__dunder__` dir (snapshots, mocks), a test
 *         or spec file, or the dir's own `index`; a key for each would only pad `paths`.
 */
const isBareImportRoot = (input: { entry: BaseUrlEntry }): boolean => {
  const name = input.entry.name;
  if (name.startsWith('.') || name === 'node_modules') return false;
  if (/^__.+__$/.test(name)) return false;
  if (input.entry.isDirectory) return true;
  return (
    !/\.(test|spec)\./.test(name) &&
    !/^index(\.d)?\.(ts|tsx|js|jsx)$/.test(name)
  );
};

/**
 * .what = the `paths` entries that keep each bare-import lookup `baseUrl` gave, one per top-level entry
 *         of the `baseUrl` dir: `"logic/*": ["./src/logic/*"]` for a dir, `"config": ["./src/config"]`
 *         for a module file.
 * .why  = a `"*"` catch-all would keep the lookup for tsc, but tsc-alias skips a key with no prefix, so
 *         a bare import would ship unrewritten in `dist` and fail at runtime; a named key is rewritten.
 *         an entry added later has no key, so its bare import fails loud with TS2307, never at runtime.
 */
const asLookupPathEntries = (input: {
  baseUrl: string;
  entries: BaseUrlEntry[];
}): { key: string; text: string }[] => {
  const keys = input.entries
    .filter((entry) => isBareImportRoot({ entry }))
    .flatMap((entry): [string, string][] => {
      const target = (name: string) =>
        asPathValueRelativeToTsconfig({ value: name, baseUrl: input.baseUrl });
      if (entry.isDirectory)
        return [[`${entry.name}/*`, target(`${entry.name}/*`)]];
      const stem = /^(.+?)(\.d)?\.(ts|tsx|js|jsx)$/.exec(entry.name)?.[1];
      return stem ? [[stem, target(stem)]] : [];
    });
  return [...new Map(keys).entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({ key, text: `"${key}": ["${value}"]` }));
};

/**
 * .what = true when a `paths` body declares the key, outside a comment.
 * .why  = a key the repo already declares keeps its own targets; the fold never doubles it.
 */
const isPathKeyDeclared = (input: { body: string; key: string }): boolean =>
  new RegExp(`"${input.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`).test(
    input.body,
  );

/**
 * .what = the splice that adds the bare-import lookup keys at the head of `paths`, or null when the
 *         repo declares its own `"*"` catch-all or every key is already declared.
 * .why  = tsc 5 looked up every bare import under `baseUrl`, beside the `paths` aliases; the keys keep
 *         that lookup once `baseUrl` leaves, for tsc and for tsc-alias alike.
 */
const asSpliceToAddLookupPaths = (input: {
  view: JsoncView;
  baseUrl: string;
  entries: BaseUrlEntry[];
}): TextSplice | null => {
  const span = getPathsSpan({ view: input.view });
  if (!span) return null;
  const body = input.view.shape.slice(span.from, span.until);
  if (isPathKeyDeclared({ body, key: '*' })) return null;
  const lookups = asLookupPathEntries(input).filter(
    (entry) => !isPathKeyDeclared({ body, key: entry.key }),
  );
  if (!lookups.length) return null;
  return {
    start: span.from,
    end: span.from,
    text: lookups.map((entry) => ` ${entry.text},`).join(''),
  };
};

/**
 * .what = the splice that swaps one entry for a `paths` block of the lookup keys.
 * .why  = a tsconfig with a nested `baseUrl` and no `paths` keeps its bare-import lookups in a new
 *         block, in the slot `baseUrl` held.
 */
const asSpliceToSwapEntryForPaths = (input: {
  entry: { start: number; end: number };
  lookups: { text: string }[];
}): TextSplice => ({
  start: input.entry.start,
  end: input.entry.end,
  text: `"paths": { ${input.lookups.map((lookup) => lookup.text).join(', ')} }`,
});

/**
 * .what = the top-level entries of the `baseUrl` dir, or none when the dir is absent.
 * .why  = the fold names one lookup key per entry; an absent dir held no bare import to keep.
 */
const getAllBaseUrlEntries = (input: { dir: string }): BaseUrlEntry[] => {
  if (!existsSync(input.dir)) return [];
  return readdirSync(input.dir, { withFileTypes: true }).map((dirent) => ({
    name: dirent.name,
    isDirectory: dirent.isDirectory(),
  }));
};

/**
 * .what = true when `baseUrl` names the tsconfig's own dir (`"."`, `"./"`, `".//"`).
 * .why  = under a root `baseUrl` every `paths` value already maps the same files once led with `./`,
 *         and bare root imports (`'src/x'`) are absent from adopter code, so no lookup key is owed.
 */
const isBaseUrlTheTsconfigDir = (input: { baseUrl: string }): boolean =>
  ['.', './', '${configDir}', '${configDir}/'].includes(
    path.posix.join(input.baseUrl),
  );

/**
 * .what = the dir a `baseUrl` names, read the way tsc reads it.
 * .why  = an absolute `baseUrl` names itself, and `${configDir}` names the tsconfig's own dir; a
 *         plain join onto the project root would list the wrong dir, and the lookup keys would vanish.
 */
const asBaseUrlDir = (input: { root: string; baseUrl: string }): string => {
  const value = input.baseUrl.replace(/^\$\{configDir\}/, '.');
  return path.isAbsolute(value) ? value : path.join(input.root, value);
};


/**
 * .what = the contents with `baseUrl` folded into `paths`: each value rebased, one lookup key added per
 *         entry of a nested `baseUrl` dir, and `baseUrl` removed.
 * .why  = typescript 7 rejects `baseUrl` (TS5102), and each alias and bare import must still point
 *         where it did.
 * .note = `entries` lists the `baseUrl` dir, and is empty for a root `baseUrl`: bare root imports
 *         (`'src/x'`) are absent from adopter code, so no lookup key is owed there.
 */
const asContentsWithBaseUrlFolded = (input: {
  contents: string;
  entries: BaseUrlEntry[];
}): string => {
  const view = asJsoncView({ contents: input.contents });
  const baseUrl = getOneJsoncCompilerOptionString({ view, key: 'baseUrl' });
  if (!baseUrl) return input.contents;

  // with no paths, the baseUrl entry becomes a paths block of its lookup keys, or leaves when none are owed
  const rebased = asSplicesToRebasePaths({ view, baseUrl: baseUrl.value });
  const lookups = asLookupPathEntries({
    baseUrl: baseUrl.value,
    entries: input.entries,
  });
  if (!rebased && !lookups.length)
    return asTextSpliced({
      contents: input.contents,
      splices: asSplicesToRemoveEntry({ view, entry: baseUrl }),
    });
  if (!rebased)
    return asTextSpliced({
      contents: input.contents,
      splices: [asSpliceToSwapEntryForPaths({ entry: baseUrl, lookups })],
    });

  // keep each bare-import lookup tsc 5 gave a nested baseUrl, then rebase each value and remove baseUrl
  const lookupSplice = asSpliceToAddLookupPaths({
    view,
    baseUrl: baseUrl.value,
    entries: input.entries,
  });
  return asTextSpliced({
    contents: input.contents,
    splices: [
      ...(lookupSplice ? [lookupSplice] : []),
      ...rebased,
      ...asSplicesToRemoveEntry({ view, entry: baseUrl }),
    ],
  });
};

/**
 * .what = the contents with one `"key": "value"` entry removed, or unchanged if absent.
 * .why  = reads offsets fresh, so it composes after another edit to the same file.
 */
const asContentsWithEntryRemoved = (input: {
  contents: string;
  key: string;
}): string => {
  const view = asJsoncView({ contents: input.contents });
  const entry = getOneJsoncCompilerOptionString({ view, key: input.key });
  if (!entry) return input.contents;
  return asTextSpliced({
    contents: input.contents,
    splices: asSplicesToRemoveEntry({ view, entry }),
  });
};

/**
 * .what = a tsconfig with each option typescript 7 removed cleared, as a text edit: `baseUrl` folded
 *         into `paths`, and `importsNotUsedAsValues: "remove"` dropped.
 * .why  = `importsNotUsedAsValues: remove` is already the default elision, so its drop changes no
 *         emit. `baseUrl` folds the way tsc's own TS5102 hint says: each `paths` value is rebased
 *         onto the tsconfig dir; a nested `baseUrl` also gains one lookup key per top-level entry of
 *         its dir, so bare imports still find their files, in tsc and in tsc-alias. each result is
 *         valid on typescript 5.4.5 too. both tsconfig fixes of typescript-node call this, so each
 *         converges alone, whichever order declapract runs them in.
 * .note = idempotent: a tsconfig with neither option comes back byte for byte. `root` is the project
 *         dir a relative `baseUrl` reads from
 */
export const asTsconfigWithTs7OptionsFolded = (input: {
  contents: string;
  root: string;
}): string => {
  // fold baseUrl into paths, keyed by the entries of a nested baseUrl dir
  const baseUrl = getOneJsoncCompilerOptionString({
    view: asJsoncView({ contents: input.contents }),
    key: 'baseUrl',
  });
  const entries =
    !baseUrl || isBaseUrlTheTsconfigDir({ baseUrl: baseUrl.value })
      ? []
      : getAllBaseUrlEntries({
          dir: asBaseUrlDir({ root: input.root, baseUrl: baseUrl.value }),
        });
  const withBaseUrlFolded = asContentsWithBaseUrlFolded({
    contents: input.contents,
    entries,
  });

  // drop importsNotUsedAsValues only where it reads "remove"
  if (
    !isTsconfigImportsOptionDroppable({
      view: asJsoncView({ contents: withBaseUrlFolded }),
    })
  )
    return withBaseUrlFolded;
  return asContentsWithEntryRemoved({
    contents: withBaseUrlFolded,
    key: 'importsNotUsedAsValues',
  });
};
