import { fix } from './*.declapract';

describe('domain-dir bad practice', () => {
  describe('fix edge cases', () => {
    it('should handle undefined content gracefully', async () => {
      const context = {
        relativeFilePath: 'src/domain/objects/User.ts',
      } as any;

      const result = await fix(undefined as any, context);

      expect(result.relativeFilePath).toEqual('src/domain.objects/User.ts');
      expect(result.contents).toBeNull();
      expect(result).toMatchSnapshot();
    });

    it('should handle empty content', async () => {
      const context = {
        relativeFilePath: 'src/domain/objects/Empty.ts',
      } as any;

      const result = await fix('', context);

      expect(result.relativeFilePath).toEqual('src/domain.objects/Empty.ts');
      expect(result.contents).toEqual('');
      expect(result).toMatchSnapshot();
    });

    it('should handle content with no imports (no transformation needed)', async () => {
      const contents = `export const VERSION = '1.0.0';
const internalHelper = () => {};
export class SimpleClass {}`;
      const context = {
        relativeFilePath: 'src/domain/objects/Simple.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.relativeFilePath).toEqual('src/domain.objects/Simple.ts');
      expect(result.contents).toEqual(contents);
      expect(result).toMatchSnapshot();
    });

    it('should handle content with only absolute imports (no relative transform)', async () => {
      const contents = `import { helper } from '@src/utils/helper';
import { pkg } from 'external-package';`;
      const context = {
        relativeFilePath: 'src/domain/objects/WithAbsolute.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.relativeFilePath).toEqual('src/domain.objects/WithAbsolute.ts');
      expect(result.contents).toEqual(contents);
      expect(result).toMatchSnapshot();
    });
  });


  it('should move src/domain/objects/* to src/domain.objects/*', async () => {
    const contents = `export class User {}`;
    const context = {
      relativeFilePath: 'src/domain/objects/User.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/User.ts');
    expect(result.contents).toEqual(contents);
    expect(result).toMatchSnapshot();
  });

  it('should move src/domain/* to src/domain.objects/*', async () => {
    const contents = `export const constants = {};`;
    const context = {
      relativeFilePath: 'src/domain/constants.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/constants.ts');
    expect(result.contents).toEqual(contents);
    expect(result).toMatchSnapshot();
  });

  it('should move nested src/domain/objects/nested/* to src/domain.objects/nested/*', async () => {
    const contents = `export class Invoice {}`;
    const context = {
      relativeFilePath: 'src/domain/objects/nested/Invoice.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/domain.objects/nested/Invoice.ts',
    );
    expect(result.contents).toEqual(contents);
    expect(result).toMatchSnapshot();
  });

  it('should move nested _topublish/*/src/domain/* to _topublish/*/src/domain.objects/*', async () => {
    const contents = `export class Customer {}`;
    const context = {
      relativeFilePath:
        'src/_topublish/domain-glossary-price/src/domain/objects/Price.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual(
      'src/_topublish/domain-glossary-price/src/domain.objects/Price.ts',
    );
    expect(result.contents).toEqual(contents);
    expect(result).toMatchSnapshot();
  });

  it('should move non-ts files (catch-all)', async () => {
    const contents = `{"key": "value"}`;
    const context = {
      relativeFilePath: 'src/domain/objects/config.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/config.json');
    expect(result.contents).toEqual(contents);
    expect(result).toMatchSnapshot();
  });

  it('should handle null contents', async () => {
    const context = {
      relativeFilePath: 'src/domain/readme.md',
    } as any;

    const result = await fix(null, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/readme.md');
    expect(result.contents).toBeNull();
    expect(result).toMatchSnapshot();
  });

  it('should fix ./objects/ exports in domain/index.ts', async () => {
    const contents = `export * from './objects/User';
export * from './objects/Invoice';
export { Customer } from './objects/Customer';`;
    const context = {
      relativeFilePath: 'src/domain/index.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/index.ts');
    expect(result.contents).toEqual(`export * from './User';
export * from './Invoice';
export { Customer } from './Customer';`);
    expect(result).toMatchSnapshot();
  });

  it('should fix mixed exports in domain/index.ts', async () => {
    const contents = `export * from './objects/User';
export * from './constants';
export { helpers } from './utils/helpers';`;
    const context = {
      relativeFilePath: 'src/domain/index.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/index.ts');
    expect(result.contents).toEqual(`export * from './User';
export * from './constants';
export { helpers } from './utils/helpers';`);
    expect(result).toMatchSnapshot();
  });

  it('should not modify non-index files in domain/', async () => {
    const contents = `import { User } from './objects/User';`;
    const context = {
      relativeFilePath: 'src/domain/utils.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/utils.ts');
    expect(result.contents).toEqual(contents); // unchanged
    expect(result).toMatchSnapshot();
  });

  it('should remove barrel export from ./objects in domain/index.ts', async () => {
    const contents = `export * from './objects';
export * from './constants';`;
    const context = {
      relativeFilePath: 'src/domain/index.ts',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toEqual('src/domain.objects/index.ts');
    expect(result.contents).toEqual(`export * from './constants';`);
    expect(result.contents).not.toContain('./objects');
    expect(result).toMatchSnapshot();
  });

  describe('relative import fix for domain/objects/ files', () => {
    it('should fix ../ to ./ for files in domain/objects/', async () => {
      const contents = `import { constants } from '../constants';`;
      const context = {
        relativeFilePath: 'src/domain/objects/Invoice.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.relativeFilePath).toEqual('src/domain.objects/Invoice.ts');
      expect(result.contents).toEqual(
        `import { constants } from './constants';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix ../../ to ../ for files in domain/objects/', async () => {
      const contents = `import { calculate } from '../../logic/calculate';`;
      const context = {
        relativeFilePath: 'src/domain/objects/Invoice.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.relativeFilePath).toEqual('src/domain.objects/Invoice.ts');
      expect(result.contents).toEqual(
        `import { calculate } from '../logic/calculate';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix multiple relative imports in domain/objects/ file', async () => {
      const contents = `import { constants } from '../constants';
import { helpers } from '../utils/helpers';
import { calculate } from '../../logic/calculate';
import { User } from './User';`;
      const context = {
        relativeFilePath: 'src/domain/objects/Invoice.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.contents).toEqual(`import { constants } from './constants';
import { helpers } from './utils/helpers';
import { calculate } from '../logic/calculate';
import { User } from './User';`);
      expect(result).toMatchSnapshot();
    });

    it('should not modify ./ imports (same directory)', async () => {
      const contents = `import { User } from './User';`;
      const context = {
        relativeFilePath: 'src/domain/objects/Invoice.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.contents).toEqual(`import { User } from './User';`);
      expect(result).toMatchSnapshot();
    });

    it('should not modify relative imports for files NOT in domain/objects/', async () => {
      const contents = `import { constants } from '../constants';`;
      const context = {
        relativeFilePath: 'src/domain/utils.ts',
      } as any;

      const result = await fix(contents, context);

      // file is in domain/, not domain/objects/, so imports unchanged
      expect(result.contents).toEqual(
        `import { constants } from '../constants';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should handle re-exports in domain/objects/ files', async () => {
      const contents = `export { constants } from '../constants';
export * from '../types';`;
      const context = {
        relativeFilePath: 'src/domain/objects/index.ts',
      } as any;

      const result = await fix(contents, context);

      expect(result.contents).toEqual(`export { constants } from './constants';
export * from './types';`);
      expect(result).toMatchSnapshot();
    });

    it('should NOT modify relative imports for nested files in domain/objects/nested/', async () => {
      // nested files stay at the same depth when domain/objects/ → domain.objects/
      // domain/objects/nested/Deep.ts → domain.objects/nested/Deep.ts
      // import ../User still points to domain.objects/User.ts - correct!
      const contents = `import { User } from '../User';
import { constants } from '../../constants';`;
      const context = {
        relativeFilePath: 'src/domain/objects/nested/Deep.ts',
      } as any;

      const result = await fix(contents, context);

      // path changes but imports stay the same
      expect(result.relativeFilePath).toEqual(
        'src/domain.objects/nested/Deep.ts',
      );
      expect(result.contents).toEqual(`import { User } from '../User';
import { constants } from '../../constants';`);
      expect(result).toMatchSnapshot();
    });
  });
});
