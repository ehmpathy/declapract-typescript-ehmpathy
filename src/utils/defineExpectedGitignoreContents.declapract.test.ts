import { given, then, when } from 'test-fns';

import {
  defineExpectedGitignoreContents,
  ignoresOrderedForGitignore,
} from './defineExpectedGitignoreContents';

const ignoresSortable = ['.agent/.cache/', '.cache/'];

/**
 * .what = clamps the gitignore line model (#540): CRLF in, LF out; a comment binds to the
 *         line below it; group blank lines kept
 * .why  = a flat sort of bare strings tore comments from the rule they explain, dropped the
 *         blank lines that group a file, and (on CRLF) hoisted a carriage-returned
 *         `node_modules` above its negations — the inert-negation state
 */
describe('defineExpectedGitignoreContents', () => {
  given('[case1] a CRLF file with the ordered tail', () => {
    const contents = ['coverage', 'node_modules', '!.test*/**/node_modules', '!.test*/**/node_modules/**', ''].join('\r\n');

    when('[t0] the expected contents are defined', () => {
      const output = defineExpectedGitignoreContents({ contents, ignoresSortable });

      then('the output holds no carriage return', () => {
        expect(output).not.toContain('\r');
      });

      then('the ordered tail appears once, at the end, negations after their target', () => {
        const lines = output.split('\n').filter(Boolean);
        expect(lines.filter((line) => line === 'node_modules')).toHaveLength(1);
        expect(lines.slice(-ignoresOrderedForGitignore.length)).toEqual([...ignoresOrderedForGitignore]);
      });

      then('the output matches snapshot', () => {
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('[case2] a file whose comments explain the rule below them', () => {
    const contents = ['# build output', 'dist', '# editor state', '.idea', 'coverage', ''].join('\n');

    when('[t0] the expected contents are defined', () => {
      const output = defineExpectedGitignoreContents({ contents, ignoresSortable });
      const lines = output.split('\n');

      then('each comment stays directly above its rule', () => {
        expect(lines[lines.indexOf('dist') - 1]).toEqual('# build output');
        expect(lines[lines.indexOf('.idea') - 1]).toEqual('# editor state');
      });

      then('the rules still sort, each with its comment', () => {
        expect(lines.indexOf('.idea')).toBeLessThan(lines.indexOf('dist'));
      });

      then('the output matches snapshot', () => {
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('[case3] a file grouped by blank lines', () => {
    const contents = ['# deps', 'vendor', '', '', '# build', 'dist', 'build', ''].join('\n');

    when('[t0] the expected contents are defined', () => {
      const output = defineExpectedGitignoreContents({ contents, ignoresSortable });

      then('the groups stay apart, one blank line between them', () => {
        expect(output.split('\n\n')[0]).toEqual('# deps\nvendor');
        expect(output.split('\n\n')).toHaveLength(2);
        expect(output).not.toContain('\n\n\n');
      });

      then('each group sorts within itself', () => {
        expect(output).toContain('build\n# build\ndist');
      });

      then('the declared lines land in the last group, above the tail', () => {
        const lastGroup = output.split('\n\n').slice(-1)[0]!;
        expect(lastGroup).toContain('.agent/.cache/');
        expect(lastGroup).toContain('node_modules');
      });

      then('the output matches snapshot', () => {
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('[case4] any of the above, fed its own output', () => {
    const inputs = [
      ['coverage', 'node_modules', '!.test*/**/node_modules', ''].join('\r\n'),
      ['# build output', 'dist', '# editor state', '.idea', ''].join('\n'),
      ['# deps', 'vendor', '', '# build', 'dist', 'build', '# orphan at the end', ''].join('\n'),
      ['# about deps', 'node_modules', 'dist', ''].join('\n'),
      null,
    ];

    when('[t0] the expected contents are defined twice', () => {
      then('the output is a fixed point for each input', () => {
        inputs.forEach((contents) => {
          const once = defineExpectedGitignoreContents({ contents, ignoresSortable });
          const twice = defineExpectedGitignoreContents({ contents: once, ignoresSortable });
          expect(twice).toEqual(once);
        });
      });
    });
  });

  given('[case5] a blank-free file, as every prior upgrade emitted', () => {
    const contents = ['.cache/', 'dist', 'node_modules', '!.test*/**/node_modules', '!.test*/**/node_modules/**', ''].join('\n');

    when('[t0] the expected contents are defined', () => {
      then('the output is the flat sort, unchanged from the prior model', () => {
        expect(defineExpectedGitignoreContents({ contents, ignoresSortable })).toEqual(
          ['.agent/.cache/', '.cache/', 'dist', 'node_modules', '!.test*/**/node_modules', '!.test*/**/node_modules/**', ''].join('\n'),
        );
      });
    });
  });

  /**
   * .what = a repo's own `!` negation must stay below the lines it negates
   * .why  = git honors a negation only AFTER its target. a plain sort put `!` (0x21) first,
   *         above every positive line, so an adopter's re-include went inert in silence
   */
  given('[case6] a file with its own negations, below their targets', () => {
    const contents = [
      'logs/',
      '!logs/keep.txt',
      'dist',
      'node_modules',
      '!.test*/**/node_modules',
      '!.test*/**/node_modules/**',
      '# the ambient actor dir is tracked',
      '!.agent/.actors/actor.via.repo=ambient/',
      '',
    ].join('\n');
    const once = defineExpectedGitignoreContents({ contents, ignoresSortable });

    when('[t0] the expected contents are defined', () => {
      then('each own negation follows every positive line, in file order, with its comment', () => {
        expect(once).toEqual(
          [
            '.agent/.cache/',
            '.cache/',
            'dist',
            'logs/',
            'node_modules',
            '!.test*/**/node_modules',
            '!.test*/**/node_modules/**',
            '!logs/keep.txt',
            '# the ambient actor dir is tracked',
            '!.agent/.actors/actor.via.repo=ambient/',
            '',
          ].join('\n'),
        );
      });

      then('the output is a fixed point', () => {
        expect(defineExpectedGitignoreContents({ contents: once, ignoresSortable })).toEqual(once);
      });
    });
  });
});
