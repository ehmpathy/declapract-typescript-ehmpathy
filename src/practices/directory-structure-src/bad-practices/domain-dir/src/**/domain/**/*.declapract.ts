import { FileCheckType, type FileFixFunction } from 'declapract';

// if files exist in any /domain/, this is a bad practice
export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents, context) => {
  // move any /domain/objects/* to /domain.objects/*
  // move any /domain/* to /domain.objects/*
  const newPath = context.relativeFilePath
    .replace(/\/domain\/objects\//g, '/domain.objects/')
    .replace(/\/domain\//g, '/domain.objects/');

  // fix internal export paths in index files
  // when domain/index.ts moves to domain.objects/index.ts,
  // exports like './objects/User' should become './User'
  let fixedContents = contents;
  if (fixedContents && context.relativeFilePath.includes('/domain/index.ts')) {
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
