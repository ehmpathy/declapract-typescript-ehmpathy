import { DatabaseConnection, getDatabaseConnection } from './getDatabaseConnection';

export const withDatabaseConnection =
  <I extends { dbConnection: DatabaseConnection }, O>(
    logic: (input: I) => Promise<O>,
  ) =>
  async (input: Omit<I, 'dbConnection'>): Promise<O> => {
    const dbConnection = await getDatabaseConnection();
    return logic({ ...input, dbConnection } as I);
  };
