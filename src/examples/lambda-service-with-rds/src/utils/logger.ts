import { generateLogMethods, LOG_LEVEL } from 'simple-leveled-log-methods';

/*
  purpose of logger:
  - distinguish different levels of logs
    - specifies importance
    - allows filtering which to send
  - defines standard format of log messages
  - sends to standard transport
*/

/*
  define the minimal log level
*/
const defaultLogLevel = process.env.AWS_LAMBDA_FUNCTION_NAME
  ? LOG_LEVEL.DEBUG // if AWS_LAMBA_FUNCTION_NAME is set, then we're in lambda env and should transport all messages to console
  : LOG_LEVEL.INFO; // otherwise, we're running locally and should only show info and above
const minimalLogLevel = (process.env.LOG_LEVEL as LOG_LEVEL) || defaultLogLevel; // use the log level specified or fallback to default if none specified

/*
  define the log methods
*/
export const log = generateLogMethods({ minimalLogLevel });
