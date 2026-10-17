import fs from 'fs/promises';
import path from 'node:path';

import { executeApply } from 'declapract';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  MARKER_BEGIN,
  MARKER_END,
} from './best-practice/metro.config.js.declapract';

// executeApply is slow (usecase evaluation), so widen the jest budget
jest.setTimeout(240_000);

/**
 * .what = end-to-end proof of the metro.config.js access-keyed cache findsert (#618, #676)
 * .why  = `expo export` reused one metro cache across every access, so a prep transform could
 *         ship inside a prod bundle. only a real apply proves declapract wires the custom check +
 *         fix to this file: the block lands after the repo's own lines, those lines stay, an
 *         absent file is created whole, and a second apply changes zero bytes.
 * .note = the lean declarations mirror holds only cicd-app-react-native-expo + typescript-expo
 */

const FIXTURE = './src/.test/assets/cicd-app-react-native-expo/demo-repo-expo';
const DECLARATIONS_MIRROR =
  './src/.test/assets/cicd-app-react-native-expo/declarations';
const METRO_PATH = 'metro.config.js';

const genDemoRepo = (slug: string) =>
  genTempDir({
    slug,
    clone: FIXTURE,
    symlink: [
      { at: 'declarations', to: DECLARATIONS_MIRROR },
      { at: 'node_modules', to: 'node_modules' },
    ],
  });

describe('expo metro.config.js — access-keyed cache, end to end (#618, #676)', () => {
  given("[case1] an expo repo with its own metro.config.js and no cache block", () => {
    const tempDir = genDemoRepo('declapract-expo-metro-findsert');
    const read = () => fs.readFile(path.join(tempDir, METRO_PATH), 'utf-8');
    const apply = () =>
      executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: METRO_PATH,
      });

    const state = useBeforeAll(async () => {
      const before = await read();
      await apply();
      const after1 = await read();
      await apply();
      const after2 = await read();
      return { before, after1, after2 };
    }, 230_000);

    when('[t0] declapract apply', () => {
      then("the repo's own lines stay, in front of the block", () => {
        expect(state.after1.startsWith(state.before.trimEnd())).toEqual(true);
        expect(state.after1).toContain(
          'config.resolver.unstable_enablePackageExports = true;',
        );
      });

      then('the block keys cacheVersion on ACCESS + the app config', () => {
        expect(state.after1).toContain(MARKER_BEGIN);
        expect(state.after1).toContain(MARKER_END);
        expect(state.after1).toContain("require('expo/config')");
        expect(state.after1).toContain('process.env.ACCESS');
        expect(state.after1).toContain('metroConfig.cacheVersion');
        expect(state.after1).not.toContain('@declapract{');
      });

      then('before and after match snapshot', () => {
        expect(state.before).toMatchSnapshot('metro.config.js — before');
        expect(state.after1).toMatchSnapshot('metro.config.js — after');
      });
    });

    when('[t1] declapract apply again', () => {
      then('the file is unchanged, with one block', () => {
        expect(state.after2).toEqual(state.after1);
        expect(state.after2.split(MARKER_BEGIN).length - 1).toEqual(1);
      });
    });
  });

  given('[case2] an expo repo with no metro.config.js', () => {
    const tempDir = genDemoRepo('declapract-expo-metro-absent');
    const state = useBeforeAll(async () => {
      await fs.rm(path.join(tempDir, METRO_PATH));
      await executeApply({
        config: path.join(tempDir, 'declapract.use.yml'),
        file: METRO_PATH,
      });
      const after = await fs.readFile(path.join(tempDir, METRO_PATH), 'utf-8');
      const template = await fs.readFile(
        path.join(__dirname, 'best-practice', METRO_PATH),
        'utf-8',
      );
      return { after, template };
    }, 230_000);

    when('[t0] declapract apply', () => {
      then('the file is created equal to the template', () => {
        expect(state.after).toEqual(state.template);
      });
    });
  });
});
