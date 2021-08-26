import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        serverless: expect.stringMatching(defineMinPackageVersionRegex('2.50.0')),
      }),
      scripts: expect.objectContaining({
        'deploy:release': 'npm run build && sls deploy -v -s $SERVERLESS_STAGE',
        'deploy:send-notification':
          'curl -X POST -H \'Content-type: application/json\' --data "{\\"text\\":\\"$([ -z $DEPLOYER_NAME ] && git config user.name || echo $DEPLOYER_NAME) has deployed $npm_package_name@v$npm_package_version:\nhttps://github.com/@declapract{variable.organizationName}/$npm_package_name/tree/v$npm_package_version\\"}" https://hooks.slack.com/services/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',
        'deploy:dev': 'SERVERLESS_STAGE=dev npm run deploy:release',
        'deploy:prod': 'SERVERLESS_STAGE=prod npm run deploy:release && npm run deploy:send-notification',
      }),
    }),
  );
