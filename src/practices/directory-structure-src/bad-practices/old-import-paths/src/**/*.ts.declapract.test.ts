import { check, fix } from './*.ts.declapract';

describe('old-import-paths bad practice', () => {
  describe('check', () => {
    it('should match files with data/dao imports', () => {
      const contents = `import { userDao } from '../data/dao/userDao';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with data/clients imports', () => {
      const contents = `import { stripe } from '../data/clients/stripe';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with domain/objects imports', () => {
      const contents = `import { User } from '../domain/objects/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with domain/ imports', () => {
      const contents = `import { constants } from '../domain/constants';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with logic/ imports', () => {
      const contents = `import { calculate } from '../logic/calculate';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files with new import paths', () => {
      const contents = `import { userDao } from '../access/daos/userDao';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should not match files with domain.objects imports', () => {
      const contents = `import { User } from '../domain.objects/User';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should match files with @src/data/dao imports', () => {
      const contents = `import { userDao } from '@src/data/dao/userDao';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with @src/domain/ imports', () => {
      const contents = `import { User } from '@src/domain/objects/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should match files with @src/logic/ imports', () => {
      const contents = `import { calculate } from '@src/logic/calculate';`;
      expect(() => check(contents, {} as any)).not.toThrow();
    });

    it('should not match files with @src/access/ imports', () => {
      const contents = `import { userDao } from '@src/access/daos/userDao';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });

    it('should not match files with @src/domain.objects imports', () => {
      const contents = `import { User } from '@src/domain.objects/User';`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });

  describe('fix', () => {
    it('should fix data/dao imports to access/daos', async () => {
      const contents = `import { userDao } from '../data/dao/userDao';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`import { userDao } from '../access/daos/userDao';`);
    });

    it('should fix data/clients imports to access/sdks', async () => {
      const contents = `import { stripe } from '../data/clients/stripe';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`import { stripe } from '../access/sdks/stripe';`);
    });

    it('should fix domain/objects imports to domain.objects', async () => {
      const contents = `import { User } from '../domain/objects/User';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`import { User } from '../domain.objects/User';`);
    });

    it('should fix domain/ imports to domain.objects/', async () => {
      const contents = `import { constants } from '../domain/constants';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(
        `import { constants } from '../domain.objects/constants';`,
      );
    });

    it('should fix logic/ imports to domain.operations/', async () => {
      const contents = `import { calculate } from '../logic/calculate';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(
        `import { calculate } from '../domain.operations/calculate';`,
      );
    });

    it('should fix multiple imports in the same file', async () => {
      const contents = `
import { User } from '../domain/objects/User';
import { userDao } from '../data/dao/userDao';
import { calculate } from '../logic/billing/calculate';
`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`
import { User } from '../domain.objects/User';
import { userDao } from '../access/daos/userDao';
import { calculate } from '../domain.operations/billing/calculate';
`);
    });

    it('should handle double-quoted imports', async () => {
      const contents = `import { User } from "../domain/objects/User";`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`import { User } from "../domain.objects/User";`);
    });

    it('should fix @src/data/dao imports to @src/access/daos', async () => {
      const contents = `import { userDao } from '@src/data/dao/userDao';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(
        `import { userDao } from '@src/access/daos/userDao';`,
      );
    });

    it('should fix @src/data/clients imports to @src/access/sdks', async () => {
      const contents = `import { stripe } from '@src/data/clients/stripe';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(
        `import { stripe } from '@src/access/sdks/stripe';`,
      );
    });

    it('should fix @src/domain/objects imports to @src/domain.objects', async () => {
      const contents = `import { User } from '@src/domain/objects/User';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`import { User } from '@src/domain.objects/User';`);
    });

    it('should fix @src/domain/ imports to @src/domain.objects/', async () => {
      const contents = `import { constants } from '@src/domain/constants';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(
        `import { constants } from '@src/domain.objects/constants';`,
      );
    });

    it('should fix @src/logic/ imports to @src/domain.operations/', async () => {
      const contents = `import { calculate } from '@src/logic/calculate';`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(
        `import { calculate } from '@src/domain.operations/calculate';`,
      );
    });

    it('should fix mixed relative and @src imports', async () => {
      const contents = `
import { User } from '@src/domain/objects/User';
import { userDao } from '../data/dao/userDao';
import { calculate } from '@src/logic/billing/calculate';
`;
      const { contents: fixed } = await fix(contents, {} as any);
      expect(fixed).toEqual(`
import { User } from '@src/domain.objects/User';
import { userDao } from '../access/daos/userDao';
import { calculate } from '@src/domain.operations/billing/calculate';
`);
    });
  });
});
