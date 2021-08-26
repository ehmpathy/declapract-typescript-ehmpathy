import expect from 'expect';
import { defineMinPackageVersionRegex } from 'declapract';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        pg: '8.2.1',
        yesql: '4.1.3',
      }),
      devDependencies: expect.objectContaining({
        'sql-code-generator': expect.stringMatching(defineMinPackageVersionRegex('0.8.2')),
        'sql-dao-generator': expect.stringMatching(defineMinPackageVersionRegex('0.2.0')),
        'sql-schema-control': expect.stringMatching(defineMinPackageVersionRegex('0.7.3')),
        'sql-schema-generator': expect.stringMatching(defineMinPackageVersionRegex('0.21.1')),
        '@types/yesql': '3.2.2',
        '@types/pg': '7.14.3',
      }),
      scripts: expect.objectContaining({
        'generate:dao': 'npx sql-dao-generator generate && npm run format',
        'generate:schema': 'npx sql-schema-generator generate -c codegen.sql.schema.yml',
        'generate:types-from-sql': 'npx sql-code-generator generate -c codegen.sql.types.yml',
        'provision:docker:prepare':
          'cp provision/schema/sql/init/extensions.sql provision/docker/integration_test_db/init/ && cp provision/schema/sql/init/schema.sql provision/docker/integration_test_db/init/ && cp provision/schema/sql/init/user.cicd.sql provision/docker/integration_test_db/init/',
        'provision:docker:up':
          'docker-compose -f ./provision/docker/integration_test_db/docker-compose.yml up -d --force-recreate --build --renew-anon-volumes',
        'provision:docker:await':
          'docker-compose -f ./provision/docker/integration_test_db/docker-compose.yml exec -T postgres /root/wait-for-postgres.sh',
        'provision:docker:down': 'docker-compose -f ./provision/docker/integration_test_db/docker-compose.yml down',
        'provision:schema:plan': 'npx sql-schema-control plan -c provision/schema/control.yml',
        'provision:schema:apply': 'npx sql-schema-control apply -c provision/schema/control.yml',
        'provision:integration-test-db':
          'npm run provision:docker:prepare && npm run provision:docker:up && npm run provision:docker:await && npm run provision:schema:plan && npm run provision:schema:apply && npm run provision:schema:plan',
      }),
    }),
  );
