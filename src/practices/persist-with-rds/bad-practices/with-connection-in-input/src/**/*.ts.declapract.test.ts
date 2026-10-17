import { given, then, when } from 'test-fns';

import { check, fix } from './*.ts.declapract';

const CALLER = `import { DatabaseConnection } from '../utils/database/getDatabaseConnection';
import {
  withDatabaseConnection,
} from '../utils/database/withDatabaseConnection';

export const findSurferById = withDatabaseConnection(
  async ({ id, dbConnection }: { id: string; dbConnection: DatabaseConnection }) => {
    return dbConnection.query({ sql: 'select * from surfer where id = :id', values: { id } });
  },
);
`;

const DEFINITION = `export const withDatabaseConnection = <T>(logic: T): T => logic;
`;

describe('persist-with-rds with-connection-in-input src files (#626)', () => {
  given('[case1] a caller with a multi-line import of withDatabaseConnection', () => {
    then('the check flags it', () => {
      expect(() => check(CALLER, {} as any)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      then('one review line lands above the import and names withDatabaseContext + (input, context)', async () => {
        const { contents: after } = await fix(CALLER, {} as any);
        const markers = after!
          .split('\n')
          .filter((line) => line.includes('@declapract:review:'));
        expect(markers).toHaveLength(1);
        expect(markers[0]).toContain('withDatabaseContext');
        expect(markers[0]).toContain('(input, context)');
        // the marker sits on the `from` line of the multi-line import, at its indent
        const lines = after!.split('\n');
        const fromIndex = lines.findIndex((line) =>
          line.includes("from '../utils/database/withDatabaseConnection'"),
        );
        expect(lines[fromIndex - 1]).toContain('@declapract:review:');
        // no code line is rewritten
        expect(after!.replace(/^.*@declapract:review.*\n/m, '')).toEqual(CALLER);
        expect(after).toMatchSnapshot('caller — after');
      });

      then('a second fix pass is a no-op', async () => {
        const { contents: once } = await fix(CALLER, {} as any);
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] the extant wrapper definition', () => {
    then('the fix marks it and never deletes it', async () => {
      expect(() => check(DEFINITION, {} as any)).not.toThrow();
      const { contents: after } = await fix(DEFINITION, {} as any);
      expect(after).not.toBeNull();
      expect(after).toContain(DEFINITION.trim());
      expect(after!.split('\n')[0]).toContain('@declapract:review:');
    });
  });

  given('[case3] a file on withDatabaseContext', () => {
    then('the check skips it', () => {
      expect(() =>
        check(
          `import { withDatabaseContext } from '../utils/database/withDatabaseContext';`,
          {} as any,
        ),
      ).toThrow('does not match bad practice');
    });
  });
});
