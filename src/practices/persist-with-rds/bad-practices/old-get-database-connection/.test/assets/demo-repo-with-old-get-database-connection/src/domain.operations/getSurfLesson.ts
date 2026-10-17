import {
  type DatabaseConnection,
  getDatabaseConnection,
} from '../utils/database/getDatabaseConnection';

export const getSurfLesson = async (input: { uuid: string }) => {
  const dbConnection: DatabaseConnection = await getDatabaseConnection();
  const result = await dbConnection.query({
    sql: 'select * from surf_lesson where uuid = $1',
    values: [input.uuid],
  });
  await dbConnection.end();
  return result.rows[0] ?? null;
};
