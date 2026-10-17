import type { Config } from './Config';

export const getAccessLabel = (input: { config: Config }) =>
  `access=${input.config.environment.access}`;
