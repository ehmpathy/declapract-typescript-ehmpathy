import { readFile } from '../../../../../../../utils/readFile';
import { fix } from './.extensions.sql.declapract';

describe('.extensions.sql fix', () => {
  it('should be able to fix a file with custom extensions correctly', async () => {
    const declaredFileContents = await readFile(`${__dirname}/.extensions.sql`); // grab the declared contents
    const exampleFoundContents = `
/**
 NOTE: because db owner is not allowed to create extensions, these changes are applied manually

  NOTE: for the integration test db, these are applied automatically upon spinning up the docker instance
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
    `;
    const { contents: fixedContents } = await fix(exampleFoundContents, {
      declaredFileContents,
    } as any);
    expect(fixedContents).toContain('CREATE EXTENSION IF NOT EXISTS "cube";');
    expect(fixedContents).toContain(
      'CREATE EXTENSION IF NOT EXISTS "earthdistance";',
    );
    expect(fixedContents).toMatchSnapshot();
  });
  it('should be able to create a new file to fix case where file does not exist yet', async () => {
    const declaredFileContents = await readFile(`${__dirname}/.extensions.sql`); // grab the declared contents
    const { contents: fixedContents } = await fix(null, {
      declaredFileContents,
    } as any);
    expect(fixedContents).toMatchSnapshot();
  });
});
