import { FileCheckType, type FileFixFunction } from 'declapract';

export const check = FileCheckType.EXISTS;

export const fix: FileFixFunction = (contents) => {
  if (contents) return {}; // if contents exist, do nothing
  return {
    contents: `${`
/**
 * constants shared across the whole service but not tied to a specific domain object go in this file
 */
    `.trim()}
`,
  };
};
