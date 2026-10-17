import { getError, given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

const adopterContents = JSON.stringify(
  {
    name: 'svc-demo',
    scripts: {
      'fix:format:biome': 'biome check --write',
      'fix:format:terraform': 'terraform fmt -recursive provision',
      'fix:format':
        'npm run fix:format:biome && npm run fix:format:terraform',
      'test:format:terraform': 'terraform fmt -recursive -check provision',
      'test:format:biome': 'biome format',
      'test:format':
        'npm run test:format:biome && npm run test:format:terraform',
    },
  },
  null,
  2,
);

// each `{} as any` context below is a documented cast (rule.forbid.as-cast): this declaration reads
// only its contents, never a context field. removal path: a declapract partial-context builder.
describe('format/terraform-formatter package.json (#645)', () => {
  given('[case1] an adopter package.json with both terraform formatter commands', () => {
    when('[t0] check runs', () => {
      then('the bad practice is detected', () => {
        expect(() => check(adopterContents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fix runs', () => {
      then('both terraform keys are gone and every other key holds', async () => {
        const { contents } = await fix(adopterContents, {} as any);
        const scripts = JSON.parse(contents ?? '').scripts;
        expect(scripts['fix:format:terraform']).toBeUndefined();
        expect(scripts['test:format:terraform']).toBeUndefined();
        expect(scripts['fix:format:biome']).toEqual('biome check --write');
        expect(Object.keys(scripts)).toEqual([
          'fix:format:biome',
          'fix:format',
          'test:format:biome',
          'test:format',
        ]);
        expect(contents).toMatchSnapshot();
      });

      then('check no longer detects the bad practice on the fixed output', async () => {
        const { contents } = await fix(adopterContents, {} as any);
        const error = await getError(() => check(contents, {} as any));
        expect(error.message).toContain('does not match bad practice');
      });

      then('fix on its own output changes zero bytes', async () => {
        const once = (await fix(adopterContents, {} as any)).contents;
        const twice = (await fix(once, {} as any)).contents;
        expect(twice).toEqual(once);
      });
    });
  });

  given('[case2] a package.json with only one of the two keys', () => {
    then('the bad practice is detected', () => {
      const contents = JSON.stringify({
        scripts: { 'test:format:terraform': 'terraform fmt -check' },
      });
      expect(() => check(contents, {} as any)).not.toThrow();
    });
  });

  given('[case3] a package.json with no terraform formatter', () => {
    then('the bad practice is not detected', async () => {
      const contents = JSON.stringify({
        scripts: { 'fix:format': 'npm run fix:format:biome' },
      });
      const error = await getError(() => check(contents, {} as any));
      expect(error.message).toContain('does not match bad practice');
    });
  });
});
