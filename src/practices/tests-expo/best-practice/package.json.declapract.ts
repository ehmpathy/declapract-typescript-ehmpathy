import { FileCheckType } from 'declapract';

/**
 * .what = the expo half of the tests triad: the jest-expo transform stack that
 *         replaces node's `@swc/jest`.
 * .why  = an expo app's tests must transform react-native + expo ESM through
 *         babel-preset-expo (metro's transform), which jest-expo wires up. these deps
 *         track the installed expo SDK major (jest-expo 54 pairs with expo 54), so the
 *         floors are minima, not pins — a repo on a newer SDK bumps them.
 *
 * .caveat = these versions are SDK-coupled and un-validatable without a live expo repo;
 *           the emit is proven at the declapract-emit bar (the integration test), the
 *           live jest-expo run is proven against a real expo repo per the wisher's
 *           accepted validation bar for this fork.
 */
export const check = FileCheckType.CONTAINS;
