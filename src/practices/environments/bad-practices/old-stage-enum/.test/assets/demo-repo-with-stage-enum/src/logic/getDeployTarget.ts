import { Stage } from 'sdk-environment';

// unambiguous property accesses — migrated to their string literals
export const prodStage = Stage.PRODUCTION;
export const testStage = Stage.TEST;

// axis-ambiguous — LEFT in place, never guessed (a human decides the axis)
export const devStage = Stage.DEVELOPMENT;

// a regex literal that MENTIONS the enum text — the parser classifies it as a
// RegularExpressionLiteral, never a property access, so it must survive byte-for-byte
export const stageMatcher = /Stage\.PRODUCTION/;

// a template literal whose STATIC text mentions the enum — also never spliced
export const label = `deploy target: Stage.TEST`;
