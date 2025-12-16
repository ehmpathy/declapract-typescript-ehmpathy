import { FileCheckType } from 'declapract';

// sdks (third party remote service contracts) are optional - not all services use external apis
export const check = { type: FileCheckType.EXISTS, optional: true };
