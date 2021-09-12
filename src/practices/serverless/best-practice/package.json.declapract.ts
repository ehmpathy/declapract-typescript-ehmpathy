import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents, context) => {
  if (!contents) return { contents }; // do nothing if no contents
  const packageJSON = JSON.parse(contents);
  const updatedPackageJSON = {
    ...packageJSON,
    scripts: {
      ...packageJSON.scripts,
      'deploy:release': 'npm run build && sls deploy -v -s $SERVERLESS_STAGE', // support releasing to different stages
      'deploy:dev': 'SERVERLESS_STAGE=dev npm run deploy:release',
      'deploy:prod':
        'SERVERLESS_STAGE=prod npm run deploy:release && npm run deploy:send-notification',
      deploy: undefined,
    },
  };
  return {
    contents: JSON.stringify(updatedPackageJSON, null, 2),
  };
};
