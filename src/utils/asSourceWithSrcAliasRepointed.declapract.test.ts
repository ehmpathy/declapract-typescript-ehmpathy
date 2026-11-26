import { asSourceWithSrcAliasRepointed } from './asSourceWithSrcAliasRepointed';
import { isSourceWithSrcAliasKept } from './isSourceWithSrcAliasKept';

const TEST_CASES = [
  {
    description: 'repoints a named import',
    given: { contents: `import { getWaveHeight } from '@src/domain.operations/getWaveHeight';` },
    expect: { kept: true, contents: `import { getWaveHeight } from '@/src/domain.operations/getWaveHeight';` },
  },
  {
    description: 'repoints a type-only import, a re-export, and a star re-export',
    given: {
      contents: [
        `import type { Surfer } from '@src/domain.objects/Surfer';`,
        `export { getSurfer } from '@src/domain.operations/getSurfer';`,
        `export * from '@src/access/daos';`,
      ].join('\n'),
    },
    expect: {
      kept: true,
      contents: [
        `import type { Surfer } from '@/src/domain.objects/Surfer';`,
        `export { getSurfer } from '@/src/domain.operations/getSurfer';`,
        `export * from '@/src/access/daos';`,
      ].join('\n'),
    },
  },
  {
    description: 'repoints a require, a jest.mock, and a dynamic import, each quote kind kept',
    given: {
      contents: [
        `const { sdk } = require("@src/access/sdks/sdk");`,
        "jest.mock(`@src/access/sdks/sdk`);",
        `const lazy = await import('@src/domain.operations/lazy');`,
      ].join('\n'),
    },
    expect: {
      kept: true,
      contents: [
        `const { sdk } = require("@/src/access/sdks/sdk");`,
        "jest.mock(`@/src/access/sdks/sdk`);",
        `const lazy = await import('@/src/domain.operations/lazy');`,
      ].join('\n'),
    },
  },
  {
    description: 'leaves a @/src/ specifier, a relative path, and prose as written',
    given: {
      contents: [
        `import { a } from '@/src/domain.operations/a';`,
        `import { b } from '../logic/b';`,
        `// the old @src/ alias left this repo`,
      ].join('\n'),
    },
    expect: {
      kept: false,
      contents: [
        `import { a } from '@/src/domain.operations/a';`,
        `import { b } from '../logic/b';`,
        `// the old @src/ alias left this repo`,
      ].join('\n'),
    },
  },
];

describe('asSourceWithSrcAliasRepointed', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isSourceWithSrcAliasKept({ contents: thisCase.given.contents })).toEqual(
        thisCase.expect.kept,
      );
      const once = asSourceWithSrcAliasRepointed({ contents: thisCase.given.contents });
      expect(once).toEqual(thisCase.expect.contents);
      expect(isSourceWithSrcAliasKept({ contents: once })).toEqual(false);
      expect(asSourceWithSrcAliasRepointed({ contents: once })).toEqual(once);
    }),
  );
});
