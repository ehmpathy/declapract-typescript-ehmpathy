import { check, fix } from './*.ts.declapract';

// .note (rule.forbid.as-cast, option a — documented): the declapract context arg passed to
// check/fix in the tests below is a PARTIAL mock. check/fix here read only `contents` and
// `relativeFilePath` — never the rest of FileCheckContext. the `as any` asserts that partial
// to the full type. this is the repo-wide test idiom (it appears in ~68 peer
// .declapract.test.ts files, most already on main and untouched by this branch); the removal
// path is a declapract-exported context test-factory, a repo-scoped sweep out of this wish's
// bound.

describe('old-import-paths bad practice', () => {
  describe('check', () => {
    it('should match files with data/dao imports', () => {
      const contents = `import { userDao } from '../data/dao/userDao';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with data/clients imports', () => {
      const contents = `import { stripe } from '../data/clients/stripe';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with domain/objects imports', () => {
      const contents = `import { User } from '../domain/objects/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with domain/ imports', () => {
      const contents = `import { constants } from '../domain/constants';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with logic/ imports', () => {
      const contents = `import { calculate } from '../logic/calculate';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with model/ imports', () => {
      const contents = `import { User } from '../model/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with model/domainObjects imports', () => {
      const contents = `import { User } from '../model/domainObjects/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with services/ imports', () => {
      const contents = `import { userService } from '../services/userService';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should not match files with new import paths', () => {
      const contents = `import { userDao } from '../access/daos/userDao';`;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should not match files with domain.objects imports', () => {
      const contents = `import { User } from '../domain.objects/User';`;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should match files with @src/data/dao imports', () => {
      const contents = `import { userDao } from '@src/data/dao/userDao';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with @src/domain/ imports', () => {
      const contents = `import { User } from '@src/domain/objects/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with @src/logic/ imports', () => {
      const contents = `import { calculate } from '@src/logic/calculate';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with @src/model/ imports', () => {
      const contents = `import { User } from '@src/model/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with @src/services/ imports', () => {
      const contents = `import { userService } from '@src/services/userService';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should not match files with @src/access/ imports', () => {
      const contents = `import { userDao } from '@src/access/daos/userDao';`;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should not match files with @src/domain.objects imports', () => {
      const contents = `import { User } from '@src/domain.objects/User';`;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should match files with __nonpublished_modules__ imports', () => {
      const contents = `import { helper } from '../__nonpublished_modules__/helper';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with @src/__nonpublished_modules__/ imports', () => {
      const contents = `import { helper } from '@src/__nonpublished_modules__/helper';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should not match files with _topublish imports', () => {
      const contents = `import { helper } from '../_topublish/helper';`;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should match files with @/domain/ imports', () => {
      const contents = `import { User } from '@/domain/objects/User';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should match files with @/logic/ imports', () => {
      const contents = `import { calculate } from '@/logic/calculate';`;
      expect(() => check(contents, {} as any)).not.toThrow();
      expect(check(contents, {} as any)).toMatchSnapshot();
    });

    it('should not match files with @/domain.objects imports', () => {
      const contents = `import { User } from '@/domain.objects/User';`;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should throw on null contents', () => {
      expect(() => check(null as any, {} as any)).toThrowErrorMatchingSnapshot();
    });

    it('should throw on empty string contents', () => {
      const contents = ``;
      expect(() => check(contents, {} as any)).toThrowErrorMatchingSnapshot();
    });
  });

  // clamps the two-pass deferral: a file STILL UNDER a deprecated dir is
  // relocated this pass by its peer dir-move (logic-dir/data-dir/…), so this
  // in-place rewrite must DEFER — else declapract applies a relocate and an
  // in-place rewrite to one file in one apply and throws ENOENT on the unlinked
  // source. once moved to its new (non-deprecated) path, the rewrite fires.
  describe('deprecated-dir deferral (two-pass migration)', () => {
    const oldImport = `import { userDao } from '@src/data/dao/userDao';`;

    it('defers a file still under a deprecated dir (moved this pass)', () => {
      expect(() =>
        check(oldImport, {
          relativeFilePath: 'src/logic/customer/getCustomer.ts',
        } as any),
      ).toThrow('deferred to peer dir-move this pass');
    });

    it('defers each deprecated dir', () => {
      const deprecatedPaths = [
        'src/logic/x.ts',
        'src/data/x.ts',
        'src/domain/x.ts',
        'src/model/x.ts',
        'src/services/x.ts',
        'src/__nonpublished_modules__/x.ts',
      ];
      for (const relativeFilePath of deprecatedPaths) {
        expect(() =>
          check(oldImport, { relativeFilePath } as any),
        ).toThrow('deferred to peer dir-move this pass');
      }
    });

    it('does NOT defer once moved to a non-deprecated path — rewrite fires', () => {
      // same old import, but the file now lives at its post-move path
      expect(() =>
        check(oldImport, {
          relativeFilePath: 'src/domain.operations/customer/getCustomer.ts',
        } as any),
      ).not.toThrow();
    });
  });

  describe('fix edge cases', () => {
    it('should not transform already-correct imports', async () => {
      const contents = `import { userDao } from '../access/daos/userDao';
import { User } from '../domain.objects/User';
import { calculate } from '../domain.operations/calculate';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(contents);
      expect(result).toMatchSnapshot();
    });

    it('should not transform content without imports', async () => {
      const contents = `export const calculate = (a: number, b: number) => a + b;`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(contents);
      expect(result).toMatchSnapshot();
    });

    it('should handle empty content', async () => {
      const contents = ``;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(contents);
      expect(result).toMatchSnapshot();
    });

    it('should handle null content gracefully', async () => {
      const result = await fix(null as any, {} as any);
      expect(result.contents).toBeNull();
      expect(result).toMatchSnapshot();
    });

    it('should handle undefined content gracefully', async () => {
      const result = await fix(undefined as any, {} as any);
      expect(result.contents).toBeUndefined();
      expect(result).toMatchSnapshot();
    });
  });

  describe('fix', () => {
    it('should fix data/dao imports to access/daos', async () => {
      const contents = `import { userDao } from '../data/dao/userDao';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { userDao } from '../access/daos/userDao';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix data/clients imports to access/sdks', async () => {
      const contents = `import { stripe } from '../data/clients/stripe';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { stripe } from '../access/sdks/stripe';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix domain/objects imports to domain.objects', async () => {
      const contents = `import { User } from '../domain/objects/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from '../domain.objects/User';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix domain/ imports to domain.objects/', async () => {
      const contents = `import { constants } from '../domain/constants';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { constants } from '../domain.objects/constants';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix logic/ imports to domain.operations/', async () => {
      const contents = `import { calculate } from '../logic/calculate';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { calculate } from '../domain.operations/calculate';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix model/ imports to domain.objects/', async () => {
      const contents = `import { User } from '../model/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from '../domain.objects/User';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix model/domainObjects imports to domain.objects', async () => {
      const contents = `import { User } from '../model/domainObjects/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from '../domain.objects/User';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix services/ imports to domain.operations/', async () => {
      const contents = `import { userService } from '../services/userService';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { userService } from '../domain.operations/userService';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix multiple imports in the same file', async () => {
      const contents = `
import { User } from '../domain/objects/User';
import { userDao } from '../data/dao/userDao';
import { calculate } from '../logic/billing/calculate';
`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`
import { User } from '../domain.objects/User';
import { userDao } from '../access/daos/userDao';
import { calculate } from '../domain.operations/billing/calculate';
`);
      expect(result).toMatchSnapshot();
    });

    it('should handle double-quoted imports', async () => {
      const contents = `import { User } from "../domain/objects/User";`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from "../domain.objects/User";`);
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/data/dao imports to @src/access/daos', async () => {
      const contents = `import { userDao } from '@src/data/dao/userDao';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { userDao } from '@src/access/daos/userDao';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/data/clients imports to @src/access/sdks', async () => {
      const contents = `import { stripe } from '@src/data/clients/stripe';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { stripe } from '@src/access/sdks/stripe';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/domain/objects imports to @src/domain.objects', async () => {
      const contents = `import { User } from '@src/domain/objects/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from '@src/domain.objects/User';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/domain/ imports to @src/domain.objects/', async () => {
      const contents = `import { constants } from '@src/domain/constants';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { constants } from '@src/domain.objects/constants';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/logic/ imports to @src/domain.operations/', async () => {
      const contents = `import { calculate } from '@src/logic/calculate';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { calculate } from '@src/domain.operations/calculate';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/model/ imports to @src/domain.objects/', async () => {
      const contents = `import { User } from '@src/model/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from '@src/domain.objects/User';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/services/ imports to @src/domain.operations/', async () => {
      const contents = `import { userService } from '@src/services/userService';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { userService } from '@src/domain.operations/userService';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix mixed relative and @src imports', async () => {
      const contents = `
import { User } from '@src/domain/objects/User';
import { userDao } from '../data/dao/userDao';
import { calculate } from '@src/logic/billing/calculate';
`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`
import { User } from '@src/domain.objects/User';
import { userDao } from '../access/daos/userDao';
import { calculate } from '@src/domain.operations/billing/calculate';
`);
      expect(result).toMatchSnapshot();
    });

    it('should fix __nonpublished_modules__ imports to _topublish', async () => {
      const contents = `import { helper } from '../__nonpublished_modules__/helper';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { helper } from '../_topublish/helper';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix @src/__nonpublished_modules__/ imports to @src/_topublish/', async () => {
      const contents = `import { helper } from '@src/__nonpublished_modules__/helper';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { helper } from '@src/_topublish/helper';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix @/domain/objects imports to @/domain.objects', async () => {
      const contents = `import { User } from '@/domain/objects/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(`import { User } from '@/domain.objects/User';`);
      expect(result).toMatchSnapshot();
    });

    it('should fix @/domain/ imports to @/domain.objects/', async () => {
      const contents = `import { constants } from '@/domain/constants';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { constants } from '@/domain.objects/constants';`,
      );
      expect(result).toMatchSnapshot();
    });

    it('should fix @/logic/ imports to @/domain.operations/', async () => {
      const contents = `import { calculate } from '@/logic/calculate';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { calculate } from '@/domain.operations/calculate';`,
      );
      expect(result).toMatchSnapshot();
    });
  });

  // r10 (l3) blocker 3: the fix regex is a global `from '...'` / `export … from '...'` path
  // rewrite, so the import STATEMENT shape (type-only, barrel re-export, deep-relative depth,
  // multi-named on one line) is orthogonal — the path in the quotes is all it touches. these
  // cases prove that orthogonality explicitly, so a real consumer's varied import styles are
  // clamped, not assumed.
  describe('import-shape robustness (r10 blocker 3)', () => {
    it('rewrites a type-only import', async () => {
      const contents = `import type { User } from '@src/domain/objects/User';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import type { User } from '@src/domain.objects/User';`,
      );
    });

    it('rewrites a barrel re-export (export { X } from …)', async () => {
      const contents = `export { userDao } from '@src/data/dao/userDao';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `export { userDao } from '@src/access/daos/userDao';`,
      );
    });

    it('rewrites a star re-export (export * from …)', async () => {
      const contents = `export * from '@src/logic/orders/calculate';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `export * from '@src/domain.operations/orders/calculate';`,
      );
    });

    it('rewrites a deep-relative path (../../../)', async () => {
      const contents = `import { userDao } from '../../../data/dao/userDao';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { userDao } from '../../../access/daos/userDao';`,
      );
    });

    it('rewrites a multi-named import on one line', async () => {
      const contents = `import { userDao, orderDao, invoiceDao } from '@src/data/dao/index';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import { userDao, orderDao, invoiceDao } from '@src/access/daos/index';`,
      );
    });

    it('rewrites a default + named mixed import', async () => {
      const contents = `import daoDefault, { userDao } from '@src/data/dao/userDao';`;
      const result = await fix(contents, {} as any);
      expect(result.contents).toEqual(
        `import daoDefault, { userDao } from '@src/access/daos/userDao';`,
      );
    });

    it('rewrites every deprecated dir across a multi-line, multi-shape file at once', async () => {
      const contents = `import type { User } from '@src/domain/objects/User';
import { userDao, orderDao } from '../../../data/dao/index';
export { calculate } from '@src/logic/orders/calculate';
export * from '@src/services/userService';
import { stripe } from '@src/data/clients/stripe';`;
      const result = await fix(contents, {} as any);
      expect(result.contents)
        .toEqual(`import type { User } from '@src/domain.objects/User';
import { userDao, orderDao } from '../../../access/daos/index';
export { calculate } from '@src/domain.operations/orders/calculate';
export * from '@src/domain.operations/userService';
import { stripe } from '@src/access/sdks/stripe';`);
    });
  });

  describe('idempotency (rule.require.idempotent-fixes)', () => {
    it('fix(fix(x)) === fix(x) — the output is a fixed point', async () => {
      const contents = `import { userDao } from '../data/dao/userDao';
import { calculate } from '../logic/calculate';`;
      const once = (await fix(contents, {} as any)).contents;
      const twice = (await fix(once, {} as any)).contents;
      expect(twice).toEqual(once);
    });

    it('check throws on the fixed output — the migrated paths no longer match, so declapract fix cannot loop', async () => {
      const contents = `import { userDao } from '../data/dao/userDao';`;
      const fixed = (await fix(contents, {} as any)).contents as string;
      expect(() => check(fixed, {} as any)).toThrow();
    });
  });
});
