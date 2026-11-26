import { getError, given, then } from 'test-fns';

import { asJsoncParsed } from './asJsoncParsed';
import { asJsoncView } from './asJsoncView';
import { asTextSpliced } from './asTextSpliced';

describe('asJsoncParsed', () => {
  given('[case1] jsonc with comments, emoji, and commas before a close', () => {
    then('it parses to the json value, strings intact', () => {
      expect(
        asJsoncParsed({
          contents: `{
  // 🐢 a header
  "a": ["x,]", "// not a comment",], /* 🌊 */
  "b": { "c": 1, },
}`,
        }),
      ).toEqual({ a: ['x,]', '// not a comment'], b: { c: 1 } });
    });
  });

  given('[case2] jsonc saved with a byte order mark at its head', () => {
    then('it parses, never a false syntax hint', () => {
      expect(
        asJsoncParsed({
          contents: `${String.fromCharCode(0xfeff)}{ "compilerOptions": { "strict": true } }`,
        }),
      ).toEqual({ compilerOptions: { strict: true } });
    });
  });
});

describe('asTextSpliced', () => {
  given('[case1] two splices that do not overlap', () => {
    then('each lands at its original offset', () => {
      expect(
        asTextSpliced({
          contents: 'abcdef',
          splices: [
            { start: 0, end: 1, text: 'A' },
            { start: 4, end: 6, text: 'EF' },
          ],
        }),
      ).toEqual('AbcdEF');
    });
  });

  given('[case2] two splices that overlap', () => {
    then('it fails loud, never a silent corrupt edit', () => {
      const error = getError(() =>
        asTextSpliced({
          contents: 'abcdef',
          splices: [
            { start: 1, end: 4, text: 'x' },
            { start: 3, end: 5, text: 'y' },
          ],
        }),
      );
      expect(error.message).toContain('text splices overlap');
    });
  });
});

describe('asJsoncView', () => {
  given('[case1] a comment that holds an astral emoji', () => {
    then('both copies keep the original length, so every offset maps', () => {
      const contents = `{ /* 🐢🌊 */ "k": "[v]" } // 🌴`;
      const view = asJsoncView({ contents });
      expect(view.text.length).toEqual(contents.length);
      expect(view.shape.length).toEqual(contents.length);
      expect(view.text.indexOf('"k"')).toEqual(contents.indexOf('"k"'));
      expect(view.shape).toContain('"_v_"');
    });
  });
});
