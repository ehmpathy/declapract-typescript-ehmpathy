import { given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

/**
 * .what = unit test of the dev-tool-in-dependencies bad practice (#657)
 * .why  = a stale test-fns in dependencies won the install over the floored devDependencies entry
 */
describe('tests-any dev-tool-in-dependencies', () => {
  // .note = a documented cast (rule.forbid.as-cast): this declaration reads no context field, so an
  //         empty record stands in. removal path: a declapract partial-context builder.
  const context = {} as any;

  given('[case1] test-fns in both sections, the dependencies one below the floor', () => {
    const contents = JSON.stringify(
      {
        dependencies: { 'domain-objects': '0.31.0', 'test-fns': '1.4.1' },
        devDependencies: { 'test-fns': '1.17.0' },
      },
      null,
      2,
    );

    then('check detects the bad practice', () => {
      expect(() => check(contents, context)).not.toThrow();
    });

    when('[t0] fix runs', () => {
      const fixed = fix(contents, context) as { contents: string };
      const parsed = JSON.parse(fixed.contents);

      then('the dependencies duplicate is removed, and the devDependencies entry wins', () => {
        expect(parsed.dependencies).toEqual({ 'domain-objects': '0.31.0' });
        expect(parsed.devDependencies).toEqual({ 'test-fns': '1.17.0' });
      });

      then('a runtime dep is left in place', () => {
        expect(parsed.dependencies['domain-objects']).toEqual('0.31.0');
      });

      then('check no longer detects it (fixed point for the check)', () => {
        expect(() => check(fixed.contents, context)).toThrow('does not match bad practice');
      });

      then('a second fix changes zero (idempotent)', () => {
        const twice = fix(fixed.contents, context) as { contents: string };
        expect(twice.contents).toEqual(fixed.contents);
      });

      then('the output matches snapshot', () => {
        expect(fixed.contents).toMatchSnapshot();
      });
    });
  });

  given('[case2] jest + tsx in dependencies only', () => {
    const contents = JSON.stringify({ dependencies: { jest: '29.7.0', tsx: '4.0.0' } });

    when('[t0] fix runs', () => {
      const parsed = JSON.parse((fix(contents, context) as { contents: string }).contents);

      then('the tools move to devDependencies with their versions', () => {
        expect(parsed.dependencies).toEqual({});
        expect(parsed.devDependencies).toEqual({ jest: '29.7.0', tsx: '4.0.0' });
      });
    });
  });

  given('[case3] the tools sit in devDependencies only', () => {
    const contents = JSON.stringify({
      dependencies: { 'domain-objects': '0.31.0' },
      devDependencies: { jest: '30.2.0', 'test-fns': '1.17.0' },
    });

    then('check does not detect the bad practice', () => {
      expect(() => check(contents, context)).toThrow('does not match bad practice');
    });
  });
});
