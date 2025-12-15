import type { FileCheckFunction, FileFixFunction } from 'declapract';

const defineModelImportFromRelativePathName = ({
  relativeFilePath,
}: {
  relativeFilePath: string;
}) => {
  const directoriesDeepFromSrc = relativeFilePath.split('/').slice(1, -1); // all the directories between src/ and the /fileName
  const badImportPath = `${directoriesDeepFromSrc
    .map(() => '..')
    .join('/')}/model`;
  const badImportStatementIdentifierToReplace = `from '${badImportPath}`; // notice that we dont close the `'` so that we can match `.../model/some/other/stuff';`
  return badImportStatementIdentifierToReplace;
};

/**
 * check they dont import from the model dir
 */
export const check: FileCheckFunction = (contents, context) => {
  const badImportIdentifier = defineModelImportFromRelativePathName({
    relativeFilePath: context.relativeFilePath,
  });
  if (contents?.includes(badImportIdentifier)) return; // dont fail since it matches bad practice
  if (contents?.includes(`/domain/domainObjects`)) return; // matches bad practice if it has import to `.../domainObjects/...` as well
  throw new Error('does not match bad practice'); // TODO: make this less weird... its weird that we throw an error when its not bad practice
};

/**
 * replace `.../model` imports with `.../domain` imporst
 */
export const fix: FileFixFunction = (contents, context) => {
  const badImportIdentifier = defineModelImportFromRelativePathName({
    relativeFilePath: context.relativeFilePath,
  });
  if (!contents) return {}; // do nothing if no contents, fn shouldn't have been called in this case
  return {
    contents: contents
      .replace(
        badImportIdentifier,
        badImportIdentifier.replace('/model', '/domain'), // should be referencing the domain dir instead
      )
      .replace('/domainObjects', '/objects'), // and should still replace this type of import, too
  };
};
