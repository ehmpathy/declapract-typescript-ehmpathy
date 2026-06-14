import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes("from 'simple-log-methods'")) return;
  throw new Error('does not match bad practice');
};

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {};
  return {
    contents: contents
      .replace(/from 'simple-log-methods'/g, "from 'sdk-logs'")
      .replace(/generateLogMethods/g, 'genLogMethods'),
  };
};
