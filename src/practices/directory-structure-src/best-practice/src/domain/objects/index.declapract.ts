import { FileCheckType } from 'declapract';

// project should have domain objects... otherwise, what is the purpose of this thing? (how can we have a service that does not operate on a domain?)
export const check = FileCheckType.EXISTS;
