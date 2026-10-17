import { DatabaseConnection } from '../utils/database/getDatabaseConnection';
import {
  withDatabaseConnection,
} from '../utils/database/withDatabaseConnection';

export const findSurferById = withDatabaseConnection(
  async ({ id, dbConnection }: { id: string; dbConnection: DatabaseConnection }) =>
    dbConnection.query({ sql: 'select * from surfer where id = :id', values: { id } }),
);
