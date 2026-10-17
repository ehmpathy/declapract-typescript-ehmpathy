import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import depcheck from 'depcheck';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import yaml from 'yaml';

// executeApply is slow (full practice evaluation), so widen the jest budget
jest.setTimeout(180_000);

/**
 * .what = the source files a live rhachet repo holds under `.agent/`, each with an import
 * .why  = written at test time (never committed), so this repo's own depcheck never sees
 *         the fake imports; each file proves one ignorePatterns entry
 */
const AGENT_SOURCES = [
  {
    // a plugin cache in an enrolled actor dir (#639)
    relpath: '.agent/.actors/actor.via.hash=abc123/brain/.claude/plugins/x.test.ts',
    imports: 'claude-code',
  },
  {
    // a role skill vendored from another repo (#512)
    relpath: '.agent/repo=ghlitch/role=operator/skills/use.vpc.tunnel.ts',
    imports: 'declastruct-unix-network',
  },
  {
    // this repo's own role skill: still source, so still checked
    relpath: '.agent/repo=.this/role=any/skills/own.skill.ts',
    imports: 'own-undeclared-dep',
  },
];

/**
 * .what = writes the `.agent/` sources into a repo dir, and links `.claude` into the actor dir
 * .why  = rhachet links a repo's `.claude` into the enrolled actor's brain dir, so depcheck
 *         reaches the actor's plugin cache through the link too, past the `.agent/.actors` ignore
 */
const setAgentSources = async (input: { dir: string }) => {
  for (const source of AGENT_SOURCES) {
    const filepath = path.join(input.dir, source.relpath);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, `import '${source.imports}';\n`);
  }
  await fs.symlink(
    '.agent/.actors/actor.via.hash=abc123/brain/.claude',
    path.join(input.dir, '.claude'),
  );
};

/**
 * .what = runs depcheck on a repo dir with the given `.depcheckrc.yml` contents
 * .why  = proves the declared patterns hold under depcheck's own `ignore` semantics —
 *         the `!.agent/repo=.this` negation (F74) too, which a unit test cannot see
 */
const getUndeclaredDeps = async (input: {
  dir: string;
  depcheckrc: string;
}): Promise<string[]> => {
  const parsed = yaml.parse(input.depcheckrc) as {
    ignores?: string[];
    ignorePatterns?: string[];
  };
  const result = await depcheck(input.dir, {
    ignoreMatches: parsed.ignores ?? [],
    // the test-only declarations symlink is not part of the consumer repo
    ignorePatterns: ['declarations', ...(parsed.ignorePatterns ?? [])],
  });
  return Object.keys(result.missing).sort();
};

/**
 * .what = pipeline test for the .depcheckrc.yml merge (#639, #512) + expo ignore (#609)
 * .why  = only executeApply proves the extant file is reached (a CONTAINS template alone
 *         never touches an extant file), and only depcheck itself proves the patterns hold
 */
describe('lint practice .depcheckrc.yml', () => {
  given('[case1] a node repo with an extant .depcheckrc.yml that predates ignorePatterns', () => {
    const tempDir = genTempDir({
      slug: 'lint-depcheckrc-extant',
      clone: './src/practices/lint/.test/assets/repo-depcheckrc-extant',
      symlink: [{ at: 'declarations', to: './src/.test/assets/lint/declarations' }],
    });
    const rcPath = () => path.join(tempDir, '.depcheckrc.yml');

    const state = useBeforeAll(async () => {
      await setAgentSources({ dir: tempDir });
      const config = path.join(tempDir, 'declapract.use.yml');
      const before = await fs.readFile(rcPath(), 'utf-8');
      const undeclaredBefore = await getUndeclaredDeps({ dir: tempDir, depcheckrc: before });
      await executeApply({ config, file: '.depcheckrc.yml' });
      const after1 = await fs.readFile(rcPath(), 'utf-8');
      const undeclaredAfter = await getUndeclaredDeps({ dir: tempDir, depcheckrc: after1 });
      await executeApply({ config, file: '.depcheckrc.yml' });
      const after2 = await fs.readFile(rcPath(), 'utf-8');
      return { before, after1, after2, undeclaredBefore, undeclaredAfter };
    }, 170_000);

    when('[t0] declapract apply', () => {
      then('ignorePatterns holds the actor dir, its `.claude` link, and the vendored-role pair', () => {
        const parsed = yaml.parse(state.after1) as { ignorePatterns: string[] };
        expect(parsed.ignorePatterns).toEqual([
          '.agent/.actors',
          '.claude',
          '.agent/repo=*',
          '!.agent/repo=.this',
        ]);
      });

      then('the repo-own ignores survive, with their comments', () => {
        const parsed = yaml.parse(state.after1) as { ignores: string[] };
        expect(parsed.ignores).toContain('my-own-dep');
        expect(parsed.ignores).toContain('rhachet*');
        expect(state.after1).toContain('# repo-own header comment');
        expect(state.after1).toContain('# repo-own reason for a repo-own ignore');
      });

      then('a node repo gains no metro-config ignore', () => {
        expect(state.after1).not.toContain('metro-config');
      });

      then('before: depcheck flags the actor cache and the vendored skill', () => {
        expect(state.undeclaredBefore).toEqual([
          'claude-code',
          'declastruct-unix-network',
          'own-undeclared-dep',
        ]);
      });

      then('after: depcheck flags only the repo-own skill — the negation holds', () => {
        expect(state.undeclaredAfter).toEqual(['own-undeclared-dep']);
      });

      then('the before + after contents match snapshot', () => {
        expect(state.before).toMatchSnapshot('.depcheckrc.yml — before');
        expect(state.after1).toMatchSnapshot('.depcheckrc.yml — after apply');
      });
    });

    when('[t1] declapract apply again', () => {
      then('zero bytes change', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });

  given('[case2] the same extant repo under the expo usecase (#609)', () => {
    const tempDir = genTempDir({
      slug: 'lint-depcheckrc-expo',
      clone: './src/practices/lint/.test/assets/repo-depcheckrc-extant',
      symlink: [{ at: 'declarations', to: './src/.test/assets/lint/declarations' }],
    });
    const rcPath = () => path.join(tempDir, '.depcheckrc.yml');

    const state = useBeforeAll(async () => {
      const config = path.join(tempDir, 'declapract.use.expo.yml');
      // .note = filter by file only, so tests-expo stays in projectPractices
      await executeApply({ config, file: '.depcheckrc.yml' });
      const after1 = await fs.readFile(rcPath(), 'utf-8');
      await executeApply({ config, file: '.depcheckrc.yml' });
      const after2 = await fs.readFile(rcPath(), 'utf-8');
      return { after1, after2 };
    }, 170_000);

    when('[t0] declapract apply', () => {
      then('ignores holds metro-config', () => {
        const parsed = yaml.parse(state.after1) as { ignores: string[] };
        expect(parsed.ignores).toContain('metro-config');
        expect(parsed.ignores).toContain('my-own-dep');
      });

      then('the after contents match snapshot', () => {
        expect(state.after1).toMatchSnapshot('.depcheckrc.yml — expo after apply');
      });
    });

    when('[t1] declapract apply again', () => {
      then('zero bytes change', () => {
        expect(state.after2).toEqual(state.after1);
      });
    });
  });
});
