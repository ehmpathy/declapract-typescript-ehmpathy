import { FileCheckType } from 'declapract';

// TODO: move this check out into the function that defines `fix:format`, and have it check whether it should include terraform instead
export const check = FileCheckType.CONTAINS;
