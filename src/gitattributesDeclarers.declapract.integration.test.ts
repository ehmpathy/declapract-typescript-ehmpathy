import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { check as checkGit } from './practices/git/best-practice/.gitattributes.declapract';
import { check as checkDynamodb } from './practices/persist-with-dynamodb/best-practice/.gitattributes.declapract';
import { check as checkRds } from './practices/persist-with-rds/best-practice/.gitattributes.declapract';
import { check as checkRhachet } from './practices/rhachet/best-practice/.gitattributes.declapract';
import { check as checkTestsAny } from './practices/tests-any/best-practice/.gitattributes.declapract';

// executeApply evaluates the whole practice before the `file` filter narrows it
jest.setTimeout(5 * 60 * 1000);

const context = {} as Parameters<typeof checkGit>[1]; // .note = the checks read no context

/**
 * .what = the `linguist-generated` value git derives for each path, from the repo's attributes
 * .why  = order carries load in `.gitattributes`, so only git itself can say whether a path
 *         folds; a text assertion on the file cannot. hermetic: no global or system config
 */
const getLinguistGeneratedByPath = (input: {
  cwd: string;
  paths: string[];
}): Record<string, string> =>
  Object.fromEntries(
    execFileSync(
      'git',
      ['check-attr', 'linguist-generated', '--', ...input.paths],
      {
        cwd: input.cwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null',
        },
      },
    )
      .trim()
      .split('\n')
      .map((line) => {
        const [pathFound, , value] = line.split(': ');
        return [pathFound!, value!];
      }),
  );

/**
 * .what = proves every `.gitattributes` declarer together, through the real declapract pipeline
 * .why  = each practice's own suite proves its fix alone. the file is shared, so only a run of
 *         all five on one repo proves they converge (no declarer rewrites another) and that the
 *         order of sections gives git the intended last match per path. the suite sits at the
 *         `src/` root, since it spans practices and no one practice owns it
 * .teeth = emit repo-own lines ahead of the managed sections, and [case1] `the repo-own
 *          override wins` reddens; drop the `/**` from a route exception, and the yield and
 *          radio paths read `set`; reorder the layout per declarer, and [t2] is no fixed point
 */
describe('gitattributes declarers', () => {
  given('[case1] a repo that adopts all five .gitattributes declarers, with a repo-own override', () => {
    const tempDir = genTempDir({
      slug: 'gitattributes-all-declarers',
      clone: './src/.test/assets/git/repo-with-all-gitattributes-declarers',
      git: true,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });
    const read = () =>
      fs.readFile(path.join(tempDir, '.gitattributes'), 'utf-8');
    const applyEach = async (input: { practices: string[] }) => {
      for (const practice of input.practices)
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice,
          file: '.gitattributes',
        });
    };
    const practices = [
      'rhachet',
      'persist-with-rds',
      'git',
      'persist-with-dynamodb',
      'tests-any',
    ];

    when('[t0] before any apply', () => {
      then('the input holds the repo-own override and no declarer tag; it matches snapshot', async () => {
        const before = await read();
        expect(before).toContain('src/access/daos/custom/** -linguist-generated');
        expect(before).not.toMatch(/^# \[[a-z0-9-]+\] /m);
        expect(before).toMatchSnapshot('.gitattributes — before');
      });
    });

    when('[t1] each practice applies, in turn', () => {
      const scene = useThen('apply settles', async () => {
        await applyEach({ practices });
        return { after: await read() };
      });

      then('every declarer check passes on the one file', () => {
        [checkGit, checkTestsAny, checkRhachet, checkRds, checkDynamodb].forEach(
          (check) => expect(() => check(scene.after, context)).not.toThrow(),
        );
      });

      then('git folds the robocode and keeps the human surface open', () => {
        expect(
          getLinguistGeneratedByPath({
            cwd: tempDir,
            paths: [
              'src/access/daos/.generated/queryFunctions.ts',
              'src/access/daos/daoInvoice/.generated/casts.ts',
              'provision/schema/sql/.generated/types.sql',
              'src/domain.operations/setInvoice.test.ts',
              'src/app/Invoice.test.tsx',
              '.route/v2026_11_01.demo/1.vision.stone',
              '.route/v2026_11_01.demo/0.wish.md',
              '.route/v2026_11_01.demo/1.vision.yield.md',
              '.route/v2026_11_01.demo/.radio/record.1.json',
              '.behavior/v2026_11_01.demo/.reviews/peer.md',
              '.behavior/v2026_11_01.demo/0.wish.md',
              '.behavior/v2026_11_01.demo/1.vision.yield.md',
              '.behavior/v2026_11_01.demo/.radio/record.1.json',
              '.behavior/v2026_11_01.demo/.route/passage.jsonl',
              '.route/v2026_11_01.demo/notes.yield.test.ts',
              '.behavior/v2026_11_01.demo/.radio/probe.test.ts',
            ],
          }),
        ).toEqual({
          // only the `.generated/` dirs fold, at any depth under the daos and the schemas
          'src/access/daos/.generated/queryFunctions.ts': 'set',
          'src/access/daos/daoInvoice/.generated/casts.ts': 'set',
          'provision/schema/sql/.generated/types.sql': 'set',
          'src/domain.operations/setInvoice.test.ts': 'set',
          'src/app/Invoice.test.tsx': 'set',
          // each route root: the trail folds, `0.wish.md` included (Q3); yields and radio stay open
          '.route/v2026_11_01.demo/1.vision.stone': 'set',
          '.route/v2026_11_01.demo/0.wish.md': 'set',
          '.route/v2026_11_01.demo/1.vision.yield.md': 'unset',
          '.route/v2026_11_01.demo/.radio/record.1.json': 'unset',
          '.behavior/v2026_11_01.demo/.reviews/peer.md': 'set',
          '.behavior/v2026_11_01.demo/0.wish.md': 'set',
          '.behavior/v2026_11_01.demo/1.vision.yield.md': 'unset',
          '.behavior/v2026_11_01.demo/.radio/record.1.json': 'unset',
          // the route machinery a behavior dir holds (its passage log) folds with it
          '.behavior/v2026_11_01.demo/.route/passage.jsonl': 'set',
          // a yield or radio file named like a test stays open: rhachet's exceptions sit last
          '.route/v2026_11_01.demo/notes.yield.test.ts': 'unset',
          '.behavior/v2026_11_01.demo/.radio/probe.test.ts': 'unset',
        });
      });

      then('snapshots, the daos, the schemas, and domain source stay unspecified', () => {
        expect(
          getLinguistGeneratedByPath({
            cwd: tempDir,
            paths: [
              'src/domain.operations/__snapshots__/setInvoice.test.ts.snap',
              'src/access/daos/daoInvoice/findByUnique.ts',
              'provision/schema/sql/tables/invoice.sql',
              'provision/schema/sql/init/.schema.sql',
              'src/domain.objects/Invoice.ts',
            ],
          }),
        ).toEqual({
          'src/domain.operations/__snapshots__/setInvoice.test.ts.snap':
            'unspecified',
          // the daos and the schemas are internal contracts: a reviewer reads them open
          'src/access/daos/daoInvoice/findByUnique.ts': 'unspecified',
          'provision/schema/sql/tables/invoice.sql': 'unspecified',
          'provision/schema/sql/init/.schema.sql': 'unspecified',
          'src/domain.objects/Invoice.ts': 'unspecified',
        });
      });

      then('the repo-own override wins over the dao collapse', () => {
        expect(
          getLinguistGeneratedByPath({
            cwd: tempDir,
            paths: ['src/access/daos/custom/.generated/report.ts'],
          }),
        ).toEqual({ 'src/access/daos/custom/.generated/report.ts': 'unset' });
      });

      then('the output holds every declarer section in order, then the repo-own lines; it matches snapshot', () => {
        const tags = [...scene.after.matchAll(/^# \[([a-z0-9-]+)\] /gm)].map(
          (match) => match[1],
        );
        expect([...new Set(tags)]).toEqual([
          'git',
          'tests-any',
          'persist-with-rds',
          'persist-with-dynamodb',
          'rhachet',
        ]); // .note = rds and dynamodb both carry `src/access/daos/**/.generated/**`; no fix edits the other's section
        expect(scene.after.trim().split('\n').slice(-1)[0]).toEqual(
          'src/access/daos/custom/** -linguist-generated',
        );
        expect(scene.after).toMatchSnapshot('.gitattributes — all declarers');
      });
    });

    when('[t2] each practice applies again, in reverse', () => {
      const before = useBeforeAll(async () => ({ contents: await read() }));
      const scene = useThen('apply again', async () => {
        await applyEach({ practices: [...practices].reverse() });
        return { after: await read() };
      });

      then('the file is byte-identical — no declarer rewrites another', () => {
        expect(scene.after).toEqual(before.contents);
      });
    });

    /**
     * .what = a fold hides no line from `git diff` (case=6)
     * .why  = github folds a file but its +/- counts stay true, and a local diff shows every line;
     *         `linguist-generated` is no diff attribute, so the counts are the honest tell. a swap
     *         to `-diff` would hide the lines, and this clamp reddens
     */
    when('[t3] a line is cut from a folded test file', () => {
      const fileTest = 'src/domain.operations/setInvoiceTotal.test.ts';
      const scene = useThen('git diffs the cut', async () => {
        const env = {
          ...process.env,
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null',
        };
        await fs.mkdir(path.join(tempDir, path.dirname(fileTest)), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(tempDir, fileTest),
          "expect(total).toEqual(7);\nexpect(total).toBeGreaterThan(0);\n",
        );
        execFileSync('git', ['add', '--', fileTest], { cwd: tempDir, env });
        await fs.writeFile(
          path.join(tempDir, fileTest),
          'expect(total).toEqual(7);\n',
        );
        const numstat = execFileSync(
          'git',
          ['diff', '--numstat', '--', fileTest],
          { cwd: tempDir, encoding: 'utf8', env },
        ).trim();
        return { numstat };
      });

      then('the file reads folded to git', () => {
        expect(
          getLinguistGeneratedByPath({ cwd: tempDir, paths: [fileTest] }),
        ).toEqual({ [fileTest]: 'set' });
      });

      then('git diff still counts the cut line: 0 added, 1 removed', () => {
        expect(scene.numstat).toEqual(`0\t1\t${fileTest}`);
      });
    });
  });

  /**
   * .what = a repo with no `.gitattributes` that adopts git and dynamodb, but not rds
   * .why  = two cells [case1] cannot reach: first adoption, where the file is born (ad1); and a
   *         dynamodb-only repo (dd3), where rds is absent, so only dynamodb's own section folds the
   *         dao tree
   */
  given('[case3] a repo with no .gitattributes, that adopts git and persist-with-dynamodb', () => {
    const tempDir = genTempDir({
      slug: 'gitattributes-born-dynamodb',
      clone: './src/.test/assets/git/repo-with-all-gitattributes-declarers',
      git: true,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] the file is removed, then each practice applies', () => {
      const scene = useThen('apply settles', async () => {
        await fs.rm(path.join(tempDir, '.gitattributes'));
        for (const practice of ['persist-with-dynamodb', 'git'])
          await executeApply({
            config: path.join(tempDir, 'declapract.use.yml'),
            practice,
            file: '.gitattributes',
          });
        return {
          after: await fs.readFile(path.join(tempDir, '.gitattributes'), 'utf-8'),
        };
      });

      then('the file is born, and both checks pass on it', () => {
        expect(() => checkGit(scene.after, context)).not.toThrow();
        expect(() => checkDynamodb(scene.after, context)).not.toThrow();
      });

      then('it holds the git sections, then the dynamodb section, and no other', () => {
        const tags = [...scene.after.matchAll(/^# \[([a-z0-9-]+)\] /gm)].map(
          (match) => match[1],
        );
        expect([...new Set(tags)]).toEqual(['git', 'persist-with-dynamodb']);
        expect(scene.after).toMatchSnapshot('.gitattributes — born, git + dynamodb');
      });

      then('git folds the dao .generated dir; the daos, terraform output, and test files stay open', () => {
        expect(
          getLinguistGeneratedByPath({
            cwd: tempDir,
            paths: [
              'src/access/daos/.generated/casts.ts',
              'src/access/daos/daoInvoice/index.ts',
              'provision/aws/product/main.tf',
              'src/domain.operations/setInvoice.test.ts',
            ],
          }),
        ).toEqual({
          'src/access/daos/.generated/casts.ts': 'set',
          'src/access/daos/daoInvoice/index.ts': 'unspecified',
          'provision/aws/product/main.tf': 'unspecified',
          // tests-any is not adopted here, so its fold is absent
          'src/domain.operations/setInvoice.test.ts': 'unspecified',
        });
      });
    });
  });

  /**
   * .what = a repo that dropped tests-any, with a repo-own override under its old fold (ad8, case=4)
   * .why  = the dropped section persists as a foreign block, and the override must still win after
   *         an apply of the declarers the repo keeps; only git itself can say which line wins
   */
  given('[case4] a repo that dropped tests-any, and un-folds one test file', () => {
    const tempDir = genTempDir({
      slug: 'gitattributes-dropped-declarer',
      clone: './src/.test/assets/git/repo-with-all-gitattributes-declarers',
      git: true,
      symlink: [
        { at: 'declarations', to: './src/.test/assets/git/declarations' },
        { at: 'node_modules', to: 'node_modules' },
      ],
    });

    when('[t0] git applies over the stale section', () => {
      const scene = useThen('apply settles', async () => {
        await fs.writeFile(
          path.join(tempDir, '.gitattributes'),
          [
            '# [tests-any] collapse test source in pr diffs; snapshots stay open',
            '*.test.ts linguist-generated',
            '*.test.tsx linguist-generated',
            '',
            'src/domain.operations/keep.test.ts -linguist-generated',
            '',
          ].join('\n'),
        );
        await executeApply({
          config: path.join(tempDir, 'declapract.use.yml'),
          practice: 'git',
          file: '.gitattributes',
        });
        return {
          after: await fs.readFile(path.join(tempDir, '.gitattributes'), 'utf-8'),
        };
      });

      then('the dropped section stays, byte for byte, and the override stays last', () => {
        expect(scene.after).toContain(
          '# [tests-any] collapse test source in pr diffs; snapshots stay open\n*.test.ts linguist-generated\n*.test.tsx linguist-generated\n',
        );
        expect(scene.after.trim().split('\n').slice(-1)[0]).toEqual(
          'src/domain.operations/keep.test.ts -linguist-generated',
        );
      });

      then('the settled file matches snapshot', () => {
        // the foreign block's place, between the git section and the override, reads as a diff
        expect(scene.after).toMatchSnapshot('.gitattributes — a dropped declarer, after git');
      });

      then('git still folds other test files, and the override still wins', () => {
        expect(
          getLinguistGeneratedByPath({
            cwd: tempDir,
            paths: [
              'src/domain.operations/setInvoice.test.ts',
              'src/domain.operations/keep.test.ts',
            ],
          }),
        ).toEqual({
          'src/domain.operations/setInvoice.test.ts': 'set',
          'src/domain.operations/keep.test.ts': 'unset',
        });
      });
    });
  });

  /**
   * .what = this repo's `.gitattributes` satisfies the declarers it consumes
   * .why  = `useCase: npm-package` carries git, tests-any, and rhachet, yet no gate runs their
   *         checks against this repo; without this case, self-application drift is silent
   * .note = the test names carry the fix, since jest prints them and little else of use
   */
  given('[case2] this repo, which consumes the practices it declares', () => {
    const fileOwn = useBeforeAll(async () => ({
      contents: await fs.readFile(
        path.join(__dirname, '..', '.gitattributes'),
        'utf-8',
      ),
    }));

    when('[t0] the shipped declarations are asked about it', () => {
      then(
        'the git practice is satisfied -- if red, run `rhx declapract.self.apply --practice git --file .gitattributes`',
        () => {
          expect(() => checkGit(fileOwn.contents, context)).not.toThrow();
        },
      );

      then(
        'the tests-any practice is satisfied -- if red, run `rhx declapract.self.apply --practice tests-any --file .gitattributes`',
        () => {
          expect(() => checkTestsAny(fileOwn.contents, context)).not.toThrow();
        },
      );

      then(
        'the rhachet practice is satisfied -- if red, run `rhx declapract.self.apply --practice rhachet --file .gitattributes`',
        () => {
          expect(() => checkRhachet(fileOwn.contents, context)).not.toThrow();
        },
      );
    });
  });
});
