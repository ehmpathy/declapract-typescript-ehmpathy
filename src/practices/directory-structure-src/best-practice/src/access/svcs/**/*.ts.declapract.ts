import { FileCheckType } from 'declapract';

// svcs (first party remote service contracts) are optional - not all services call other internal services
export const check = { type: FileCheckType.EXISTS, optional: true };
