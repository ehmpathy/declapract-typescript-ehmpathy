import { FileCheckType } from 'declapract';

// infra layer is optional - not all services need infrastructure-specific adapters
export const check = { type: FileCheckType.EXISTS, optional: true };
