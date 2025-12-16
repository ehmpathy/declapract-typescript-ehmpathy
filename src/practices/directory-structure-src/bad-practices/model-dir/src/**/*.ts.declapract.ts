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
  if (contents?.includes(badImportIdentifier)) return; // relative import to model dir
  if (contents?.includes(`@src/model`)) return; // absolute @src/model import
  if (contents?.includes(`/domain/domainObjects`)) return; // matches bad practice if it has import to `.../domainObjects/...` as well
  throw new Error('does not match bad practice'); // TODO: make this less weird... its weird that we throw an error when its not bad practice
};

/**
 * replace `.../model` imports with `.../domain.objects` imports
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
        badImportIdentifier.replace('/model', '/domain.objects'), // should be referencing the domain.objects dir instead
      )
      .replace(/@src\/model\b/g, '@src/domain.objects') // fix absolute @src/model imports
      .replace(/\/domainObjects/g, ''), // remove the domainObjects subdir as domain.objects is flat now
  };
};
