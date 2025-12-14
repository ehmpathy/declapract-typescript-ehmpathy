import { FileCheckType } from 'declapract';

// daos are optional - not all services have persistence
export const check = { type: FileCheckType.EXISTS, optional: true };
