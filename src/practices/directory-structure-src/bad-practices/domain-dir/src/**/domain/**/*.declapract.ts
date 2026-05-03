import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in any /domain/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move any /domain/objects/* to /domain.objects/*
  // move any /domain/* to /domain.objects/*
  const newPath = context.relativeFilePath
    .replace(/\/domain\/objects\//g, '/domain.objects/')
    .replace(/\/domain\//g, '/domain.objects/');

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
