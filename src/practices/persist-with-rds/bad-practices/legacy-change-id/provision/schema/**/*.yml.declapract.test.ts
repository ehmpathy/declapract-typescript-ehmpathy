import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { check, fix } from './*.yml.declapract';

const context = {} as FileCheckContext; // note: neither fn reads the context

const LEGACY = `# the init changes
- type: change
  id: init_default_txn_isolation
  author: declapract
  path: ./init/default_transaction_isolation.sql

- type: change
  id: 'init_service_user' # quoted, with a comment
  path: ./init/user.service.sql
`;

describe('legacy-change-id (#530)', () => {
  given('[case1] a definitions yml whose change entries use `id:`', () => {
    when('[t0] check runs', () => {
      then('the bad practice is detected', () => {
        expect(() => check(LEGACY, context)).not.toThrow();
      });
    });

    when('[t1] fix runs', () => {
      const { contents: fixed } = fix(LEGACY, context) as { contents: string };

      then('each change entry declares `exid:`, with its value unchanged', () => {
        expect(fixed).toContain('  exid: init_default_txn_isolation\n');
        expect(fixed).toContain("  exid: 'init_service_user' # quoted, with a comment\n");
        expect(fixed).not.toMatch(/^\s*id:/m);
      });

      then('every other byte is kept', () => {
        expect(fixed.replace(/exid:/g, 'id:')).toEqual(LEGACY);
        expect(fixed).toMatchSnapshot('init.yml — after');
      });

      then('check no longer detects the fixed output', () => {
        expect(() => check(fixed, context)).toThrow('does not match bad practice');
      });

      then('a second fix changes zero bytes', () => {
        expect((fix(fixed, context) as { contents: string }).contents).toEqual(fixed);
      });
    });
  });

  given('[case2] an `id` key outside a change entry', () => {
    const contents = `- type: resource\n  id: not_a_change\n  path: ./tables/x.sql\n`;
    when('[t0] check runs', () => {
      then('the bad practice is not detected', () => {
        expect(() => check(contents, context)).toThrow('does not match bad practice');
      });
    });
  });

  given('[case3] a change entry that already declares `exid` beside `id`', () => {
    const contents = `- type: change\n  id: a\n  exid: a\n  path: ./a.sql\n`;
    when('[t0] fix runs', () => {
      then('the entry is left alone, never given a second `exid`', () => {
        expect(() => check(contents, context)).toThrow('does not match bad practice');
        expect((fix(contents, context) as { contents: string }).contents).toEqual(contents);
      });
    });
  });

  given('[case4] a control.yml with a nested change in its definitions', () => {
    const contents = `language: postgres\ndefinitions:\n  - ./sql/init.yml\n  - type: change\n    id: nested\n    path: ./nested.sql\n`;
    when('[t0] fix runs', () => {
      then('the nested change entry is renamed', () => {
        expect((fix(contents, context) as { contents: string }).contents).toContain(
          '    exid: nested\n',
        );
      });
    });
  });
});
