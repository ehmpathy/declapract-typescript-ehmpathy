import { FileCheckType } from 'declapract';

/**
 * .what = the node half of the tests triad: the `@swc/jest` transform deps that the
 *         node jest configs use.
 * .why  = node unit/integration/acceptance jest configs transform via `@swc/jest`
 *         (fast, node-target). the expo half transforms via jest-expo/babel instead,
 *         so these deps are node-only. CONTAINS, so a repo may add more.
 */
export const check = FileCheckType.CONTAINS;
