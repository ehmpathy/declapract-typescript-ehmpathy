import type { DatabaseConnection } from '@src/utils/database/getDatabaseConnection';

// a getDatabaseConnection from another module must never be renamed
import { getDatabaseConnection as getLegacyWarehouse } from 'surf-warehouse-sdk';

export const findSurferByUuid = async (
  input: { uuid: string },
  context: { dbConnection: DatabaseConnection },
) => {
  await getLegacyWarehouse();
  return context.dbConnection.query({
    sql: 'select * from surfer where uuid = $1',
    values: [input.uuid],
  });
};
