import { FileCheckType } from 'declapract';

export const check = FileCheckType.EXISTS;
export const fix = () => `export interface Config {}`;
