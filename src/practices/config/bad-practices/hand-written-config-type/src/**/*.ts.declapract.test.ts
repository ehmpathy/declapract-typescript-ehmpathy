import type { FileCheckContext } from 'declapract';
import { getError } from 'test-fns';

import { check, fix } from './*.ts.declapract';

const contextFor = (relativeFilePath: string) =>
  ({ relativeFilePath }) as FileCheckContext;

const CASES = [
  {
    description: 'a peer import inside src/utils/config/',
    relativeFilePath: 'src/utils/config/getConfig.ts',
    before: `import type { Config } from './Config';\n`,
    after: `import type { Config } from './config.schema';\n`,
  },
  {
    description: 'a deep relative import',
    relativeFilePath: 'src/domain.operations/surf/getWaveReport.ts',
    before: `import { Config } from '../../utils/config/Config';\n`,
    after: `import { Config } from '../../utils/config/config.schema';\n`,
  },
  {
    description: 'an @src alias import, double-quoted',
    relativeFilePath: 'src/contract/handlers/getSurfLesson.ts',
    before: `import type { Config } from "@src/utils/config/Config";\n`,
    after: `import type { Config } from "@src/utils/config/config.schema";\n`,
  },
];

describe('hand-written-config-type bad practice source files (#661)', () => {
  CASES.forEach((thisCase) =>
    describe(thisCase.description, () => {
      it('check flags the file', () => {
        expect(() =>
          check(thisCase.before, contextFor(thisCase.relativeFilePath)),
        ).not.toThrow();
      });

      it('fix repoints the import to config.schema', async () => {
        const result = await fix(
          thisCase.before,
          contextFor(thisCase.relativeFilePath),
        );
        expect(result.contents).toEqual(thisCase.after);
      });

      it('fix is a fixed point and check skips the fixed output', async () => {
        const once = await fix(
          thisCase.before,
          contextFor(thisCase.relativeFilePath),
        );
        const twice = await fix(
          once.contents!,
          contextFor(thisCase.relativeFilePath),
        );
        expect(twice.contents).toEqual(once.contents);
        const error = await getError(() =>
          check(once.contents!, contextFor(thisCase.relativeFilePath)),
        );
        expect(error.message).toContain('does not import');
      });
    }),
  );

  it('skips a ./Config import outside src/utils/config/ (the repo own module)', async () => {
    const error = await getError(() =>
      check(
        `import { Config } from './Config';\n`,
        contextFor('src/domain.objects/Config.test.ts'),
      ),
    );
    expect(error.message).toContain('does not import');
  });

  it('skips a module whose name only ends in Config', async () => {
    const error = await getError(() =>
      check(
        `import { SurfConfig } from '../utils/config/SurfConfig';\n`,
        contextFor('src/utils/getSurf.ts'),
      ),
    );
    expect(error.message).toContain('does not import');
  });
});
