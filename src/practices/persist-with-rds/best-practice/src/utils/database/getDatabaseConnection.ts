import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { type QueryResult, type QueryResultRow } from 'pg';

import { getConfig } from '../config/getConfig';
import { environment } from '../environment';
import { getDatabaseConnectionViaJdbc } from './getDatabaseConnectionViaJdbc';
import { getDatabaseConnectionViaRdsDataApi } from './getDatabaseConnectionViaRdsDataApi';

export interface DatabaseConnection {
  query: <Row extends QueryResultRow>(args: {
    sql: string;
    values?: unknown[];
  }) => Promise<QueryResult<Row>>;
  end: () => Promise<void>;
}

export class DatabaseQueryError extends HelpfulError {
  constructor({
    sql,
    values,
    caught,
  }: {
    sql: string;
    values?: unknown[];
    caught: Error;
  }) {
    const message = `
caught error querying database: ${caught.message}

sql:
  ${sql.trim()}

values:
  ${JSON.stringify(values)}
    `.trim();
    super(message, { sql, values, cause: caught });
  }
}

export const getDatabaseConnection = async (): Promise<DatabaseConnection> => {
  const config = await getConfig();
  const target = config.database.target;
  const role = config.database.role.crud;

  // determine which tunnel to use based on environment.server
  const tunnel = (() => {
    // if we're on a lambda, we must use the lambda tunnel
    if (environment.server === 'AWS:LAMBDA')
      return config.database.tunnel.lambda;

    // if there's a lambda tunnel available and its via rds data api, lets use it - to try and replicate prod codepaths maximally
    if (config.database.tunnel.lambda?.via === 'rds-data-api')
      // why only if via rds-data-api? cause rds-data-api doesn't require vpc access! -> we _can_ use it
      return config.database.tunnel.lambda;

    // otherwise, there may not be usable lambda tunnel available for this access (e.g., jbdc lambdas depends on within-vpc access)
    return config.database.tunnel.local;
  })();

  // ensure tunnel is defined for the requested server
  if (!tunnel)
    throw new UnexpectedCodePathError(
      'database tunnel not configured for environment.server + env.access',
      { environment },
    );

  // route based on tunnel type
  if (tunnel.via === 'rds-data-api')
    return getDatabaseConnectionViaRdsDataApi({
      resourceArn: tunnel.resourceArn,
      secretArn: tunnel.secretArn,
      database: target.database,
      endpoint: tunnel.endpoint,
    });

  if (tunnel.via === 'jdbc')
    return getDatabaseConnectionViaJdbc({
      host: tunnel.host,
      port: tunnel.port,
      username: role.username,
      password: role.password,
      database: target.database,
    });

  throw new UnexpectedCodePathError('no supported tunnel.via mechanism', {
    tunnel,
  });
};
