import {
  type ArrayValue,
  ExecuteStatementCommand,
  type ExecuteStatementCommandOutput,
  type Field,
  RDSDataClient,
  type SqlParameter,
} from '@aws-sdk/client-rds-data';
import { type QueryResult, type QueryResultRow } from 'pg';

import {
  type DatabaseConnection,
  DatabaseQueryError,
} from './getDatabaseConnection';

export const getDatabaseConnectionViaRdsDataApi = async (config: {
  resourceArn: string;
  secretArn: string;
  database: string;
  endpoint: string | null;
}): Promise<DatabaseConnection> => {
  const client = new RDSDataClient(
    config.endpoint
      ? {
          endpoint: config.endpoint,
          credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
        }
      : {},
  );

  return {
    query: async <Row extends QueryResultRow>({
      sql,
      values,
    }: {
      sql: string;
      values?: unknown[];
    }): Promise<QueryResult<Row>> => {
      try {
        const response = await client.send(
          new ExecuteStatementCommand({
            resourceArn: config.resourceArn,
            secretArn: config.secretArn,
            database: config.database,
            sql: convertPlaceholders(sql),
            parameters: convertToParameters(values),
            includeResultMetadata: true,
          }),
        );

        const rows = parseRecords<Row>(response);

        return {
          rows,
          rowCount: rows.length,
          command: '',
          oid: 0,
          fields: [],
        };
      } catch (error) {
        throw new DatabaseQueryError({
          sql,
          values,
          caught: error as Error,
        });
      }
    },

    end: async () => {
      // No-op: RDS Data API is stateless HTTP, no connection to close
    },
  };
};

// Convert $1, $2 placeholders to :param1, :param2 for RDS Data API
const convertPlaceholders = (sql: string): string =>
  sql.replace(/\$(\d+)/g, ':param$1');

// UUID regex pattern for type hint detection
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Convert array values to RDS Data API parameter format
// We use typeHint: 'UUID' for UUID-formatted strings so RDS Data API sends them as proper UUID type.
// This works for both uuid columns AND varchar columns because we have an implicit cast (uuid AS text)
// defined in the database schema (see provision/schema/sql/init/cast.text_as_uuid.sql).
const convertToParameters = (values?: unknown[]): SqlParameter[] => {
  if (!values) return [];
  return values.map((value, index) => ({
    name: `param${index + 1}`,
    value: toField(value),
    typeHint: getTypeHint(value),
  }));
};

// Detect type hints for values that need explicit typing
const getTypeHint = (value: unknown): 'UUID' | undefined => {
  if (typeof value === 'string' && UUID_REGEX.test(value)) return 'UUID';
  return undefined;
};

// Convert JS value to RDS Data API Field type
// Note: RDS Data API doesn't support arrayValue parameters, so arrays are converted
// to PostgreSQL array literal format (e.g., {a,b,c}) for use with ANY($1::type[])
const toField = (value: unknown): Field => {
  if (value === null || value === undefined) return { isNull: true };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { longValue: value };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { stringValue: value.toISOString() };
  if (Buffer.isBuffer(value)) return { blobValue: value };
  if (Array.isArray(value))
    return { stringValue: toPostgresArrayLiteral(value) };
  return { stringValue: JSON.stringify(value) };
};

// Convert JS array to PostgreSQL array literal format: {elem1,elem2,elem3}
// Use with ANY($1::type[]) in SQL, e.g., ANY($1::text[]) or ANY($1::int[])
const toPostgresArrayLiteral = (arr: unknown[]): string => {
  const elements = arr.map((v) => {
    if (v === null) return 'NULL';
    if (typeof v === 'string') {
      // Escape backslashes and double quotes, then wrap in quotes
      const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    return String(v);
  });
  return `{${elements.join(',')}}`;
};

// Parse RDS Data API response records into typed objects
const parseRecords = <Row>(response: ExecuteStatementCommandOutput): Row[] => {
  if (!response.records || !response.columnMetadata) return [];

  return response.records.map((record) => {
    const row: Record<string, unknown> = {};
    response.columnMetadata?.forEach((col, index) => {
      const field = record[index];
      if (field && col.name) row[col.name] = fromField(field, col.typeName);
    });
    return row as Row;
  });
};

// Convert RDS Data API Field to JS value
const fromField = (field: Field, typeName?: string): unknown => {
  if (field.isNull) return null;

  // Handle PostgreSQL arrays (typeName starts with underscore, e.g., _int4, _text, _jsonb)
  if (typeName?.startsWith('_') && field.arrayValue) {
    return flattenArrayValue(field.arrayValue, typeName.slice(1));
  }

  if (field.stringValue !== undefined) {
    // Parse JSON/JSONB columns to match pg driver behavior
    if (typeName === 'json' || typeName === 'jsonb') {
      return JSON.parse(field.stringValue);
    }
    return field.stringValue;
  }
  if (field.longValue !== undefined) return Number(field.longValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.blobValue !== undefined) return field.blobValue;
  return null;
};

// Flatten RDS Data API nested array structure to native JS array
const flattenArrayValue = (
  arrayValue: ArrayValue,
  elementType?: string,
): unknown[] => {
  if (arrayValue.stringValues) {
    // Parse JSON elements if this is a json/jsonb array
    if (elementType === 'json' || elementType === 'jsonb') {
      return arrayValue.stringValues.map((v) => JSON.parse(v));
    }
    return arrayValue.stringValues;
  }
  if (arrayValue.longValues) return arrayValue.longValues.map(Number);
  if (arrayValue.doubleValues) return [...arrayValue.doubleValues];
  if (arrayValue.booleanValues) return [...arrayValue.booleanValues];
  // Nested arrays (e.g., 2D arrays)
  if (arrayValue.arrayValues) {
    return arrayValue.arrayValues.map((av) =>
      flattenArrayValue(av, elementType),
    );
  }
  return [];
};
