import { log } from './logger';

/**
 * enables input output logs for a function
 *
 * todo: - hookup visual tracing w/ external lib (vi...lo...)
 */
export const withInputOutputTracing = <T extends (...args: any[]) => any>(
  logic: T,
  options: { name: string; durationReportingThresholdInSeconds: number },
): T => {
  return (async (...args: any[]) => {
    log.debug(`${options.name}.input`, { args });
    const result = await logic(...args);
    log.debug(`${options.name}.output`, { result });
    return result;
  }) as T;
};
