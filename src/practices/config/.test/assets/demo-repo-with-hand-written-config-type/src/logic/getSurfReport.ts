import type { Config } from '../utils/config/Config';

export const getSurfReport = (input: { config: Config }) =>
  input.config.environment.access;
