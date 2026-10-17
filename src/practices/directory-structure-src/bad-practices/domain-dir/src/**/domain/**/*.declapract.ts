import { FileCheckType, type FileFixFunction } from 'declapract';

import { existsSync } from 'node:fs';
import path from 'node:path';

// if files exist in any /domain/, this is a bad practice
export const check = FileCheckType.EXISTS;

/**
 * .what = whether a file is an outer `domain/index.ts` barrel that only forwards `./objects`,
 *         beside an inner `domain/objects/index.ts` barrel.
 * .why  = both barrels move onto one path, `domain.objects/index.ts`. the outer one, once its
 *         `./objects` forward is stripped, holds no export — and if it wins the path, every domain
 *         export vanishes from the barrel with no error (#655). the inner barrel holds the real
 *         list, so the outer one must yield the path to it.
 */
const isOuterBarrelBesideInner = (input: {
  contents: string | null;
  relativeFilePath: string;
  projectRoot: string | null;
}): boolean => {
  if (!input.contents || !input.projectRoot) return false;
  if (!/(?:^|\/)domain\/index\.ts$/.test(input.relativeFilePath)) return false;
  const codeOnly = input.contents
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim();
  if (!/^export\s+\*\s+from\s+['"]\.\/objects['"];?$/.test(codeOnly))
    return false;
  // the inner barrel, before its move or after it (apply order is not guaranteed)
  const domainDir = path.join(
    input.projectRoot,
    path.dirname(input.relativeFilePath),
  );
  return (
    existsSync(path.join(domainDir, 'objects', 'index.ts')) ||
    existsSync(path.join(path.dirname(domainDir), 'domain.objects', 'index.ts'))
  );
};

export const fix: FileFixFunction = (contents, context) => {
  // an outer barrel that only forwards ./objects yields the path to the inner barrel (#655)
  if (
    isOuterBarrelBesideInner({
      contents,
      relativeFilePath: context.relativeFilePath,
      projectRoot: context.getProjectRootDirectory?.() ?? null,
    })
  )
    return { contents: null };

  // move any /domain/objects/* to /domain.objects/*
  // move any /domain/* to /domain.objects/*
  // .note = the lookahead leaves the slash after each segment unconsumed, so adjacent segments
  //         (`/domain/domain/`) each move. a consumed slash left the second `domain` segment in
  //         place, which the `src/**/domain/**/*` glob then matched again on the next apply.
  const newPath = context.relativeFilePath
    .replace(/\/domain\/objects(?=\/)/g, '/domain.objects')
    .replace(/\/domain(?=\/)/g, '/domain.objects');

  let fixedContents = contents;

  // fix relative imports for files DIRECTLY in domain/objects/ that move to domain.objects/
  // these files move UP one directory level, so reduce ../ by one
  // note: nested files (domain/objects/nested/Deep.ts) stay at same depth, no transform
  const isDirectChildOfDomainObjects = /\/domain\/objects\/[^/]+$/.test(
    context.relativeFilePath,
  );
  if (fixedContents && isDirectChildOfDomainObjects) {
    fixedContents = fixedContents.replace(
      /((?:import|export)[^'"]*['"])((?:\.\.\/)+)/g,
      (match, importPrefix, dotDots) => {
        const count = dotDots.split('../').length - 1;
        if (count === 1) {
          // '../X' → './X'
          return `${importPrefix}./`;
        }
        // '../../X' → '../X', '../../../X' → '../../X', etc.
        return `${importPrefix}${'../'.repeat(count - 1)}`;
      },
    );
  }

  // fix internal export paths in index files
  // when domain/index.ts moves to domain.objects/index.ts,
  // exports like './objects/User' should become './User'
  if (
    fixedContents &&
    context.relativeFilePath.includes('/domain/') &&
    context.relativeFilePath.endsWith('/index.ts')
  ) {
    fixedContents = fixedContents
      // export * from './objects' → remove (objects dir flattened to root)
      .replace(/export\s+\*\s+from\s+['"]\.\/objects['"];?\n?/g, '')
      // ./objects/Foo → ./Foo
      .replace(/(['"])\.\/objects\//g, '$1./')
      // ../domain/objects/Foo → ../domain.objects/Foo (for cross-references)
      .replace(/(['"])([^'"]*?)\/domain\/objects\//g, '$1$2/domain.objects/')
      // ../domain/Foo → ../domain.objects/Foo
      .replace(/(['"])([^'"]*?)\/domain\//g, '$1$2/domain.objects/');
  }

  return {
    contents: fixedContents ?? null,
    relativeFilePath: newPath,
  };
};
