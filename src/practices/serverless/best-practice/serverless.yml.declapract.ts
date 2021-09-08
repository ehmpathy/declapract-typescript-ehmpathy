import { FileCheckType } from 'declapract';
import { FileCheckDeclaration } from 'declapract/dist/domain';

export const check = FileCheckType.CONTAINS; // i.e., check that the contents of the file contains what's declared (default is equals)
