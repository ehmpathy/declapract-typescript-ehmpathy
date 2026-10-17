import type { FileCheckContext } from 'declapract';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'yaml';

import { check, fix } from './best-practice/.agent/keyrack.yml.declapract';

/**
 * .what = unit grain of the keyrack.yml findsert (#491, #487)
 * .why  = an aws repo owes AWS_PROFILE under env.all in the is-optional-if-has shape; a bare
 *         entry upgrades in place; a non-aws repo is left alone; an absent file is flagged
 * .note = the cast builds the minimal context the check/fix reads (projectPractices); it is
 *         confined to this helper, per the sanctioned test-context idiom
 */
const asContext = (projectPractices: string[]): FileCheckContext =>
  ({
    projectPractices,
    relativeFilePath: '.agent/keyrack.yml',
  }) as unknown as FileCheckContext;
const AWS = asContext(['rhachet', 'environments-aws']);
const NODE_ONLY = asContext(['rhachet', 'node']);

const fixed = (contents: string | null, context: FileCheckContext) =>
  fix(contents, context).contents as string;

const DECLARED = { key: 'AWS_PROFILE', 'is-optional-if-has': 'AWS_ACCESS_KEY_ID' };

const BASE = [
  'org: ehmpathy',
  'extends:',
  '  - .agent/repo=ehmpathy/role=mechanic/keyrack.yml',
  'env.prod: null',
  'env.prep:',
  '  - OPENROUTER_API_KEY',
  'env.test: null',
  '',
].join('\n');

describe('keyrack.yml findsert (rhachet)', () => {
  describe('a repo with no aws practice', () => {
    it('should pass check and be left verbatim', () => {
      expect(() => check(BASE, NODE_ONLY)).not.toThrow();
      expect(fixed(BASE, NODE_ONLY)).toEqual(BASE);
    });
  });

  describe('an aws repo with no AWS_PROFILE (#487)', () => {
    it('should be flagged by check', () => {
      expect(() => check(BASE, AWS)).toThrow('lacks AWS_PROFILE');
    });

    it('should add AWS_PROFILE under env.all, is-optional-if-has (#491)', () => {
      const parsed = yaml.parse(fixed(BASE, AWS));

      expect(parsed['env.all']).toEqual([DECLARED]);
    });

    it("should keep the repo's own keys and extends", () => {
      const parsed = yaml.parse(fixed(BASE, AWS));

      expect(parsed['env.prep']).toEqual(['OPENROUTER_API_KEY']);
      expect(parsed.extends).toEqual([
        '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
      ]);
    });

    it('should match snapshot', () => {
      expect(BASE).toMatchSnapshot('aws repo — before');
      expect(fixed(BASE, AWS)).toMatchSnapshot('aws repo — after');
    });
  });

  describe('an aws repo whose env.all is null, or holds other keys', () => {
    it('should seed env.all where it is null', () => {
      const input = `org: ehmpathy\nenv.all: null\n`;

      expect(yaml.parse(fixed(input, AWS))['env.all']).toEqual([DECLARED]);
    });

    it('should append beside the extant keys', () => {
      const input = `org: ehmpathy\nenv.all:\n  - SOME_KEY\n`;

      expect(yaml.parse(fixed(input, AWS))['env.all']).toEqual([
        'SOME_KEY',
        DECLARED,
      ]);
    });
  });

  describe('an aws repo with a bare AWS_PROFILE (#491)', () => {
    const input = `org: ehmpathy\nenv.test:\n  # the local aws login\n  - AWS_PROFILE\n  - OTHER\n`;

    it('should upgrade it in place, in its own env section, with its comment', () => {
      const out = fixed(input, AWS);
      const parsed = yaml.parse(out);

      expect(parsed['env.test']).toEqual([DECLARED, 'OTHER']);
      expect(parsed['env.all']).toBeUndefined();
      expect(out).toContain('# the local aws login');
    });
  });

  describe('an aws repo whose AWS_PROFILE is already a key map', () => {
    const input = `org: ehmpathy\nenv.all:\n  - key: AWS_PROFILE\n    is-optional-if-has: AWS_ROLE_ARN\n`;

    it('should keep it as the adopter shaped it', () => {
      expect(() => check(input, AWS)).not.toThrow();
      expect(fixed(input, AWS)).toEqual(input);
    });
  });

  describe('an absent keyrack.yml', () => {
    it('should be flagged by check, with the init hint', () => {
      expect(() => check(null, AWS)).toThrow('.agent/keyrack.yml is absent');
    });

    it('should offer no automatic fix (rhachet init --keys knows the org)', () => {
      expect(fix(null, AWS)).toEqual({});
    });
  });

  describe('idempotency', () => {
    const inputs = [
      { slug: 'a bare base', contents: BASE },
      { slug: 'a null env.all', contents: `org: ehmpathy\nenv.all: null\n` },
      {
        slug: 'a bare entry',
        contents: `org: ehmpathy\nenv.test:\n  - AWS_PROFILE\n`,
      },
    ];
    inputs.forEach((thisCase) => {
      it(`should be a fixed point that passes check, given ${thisCase.slug}`, () => {
        const once = fixed(thisCase.contents, AWS);

        expect(fixed(once, AWS)).toEqual(once);
        expect(() => check(once, AWS)).not.toThrow();
      });
    });
  });
});
