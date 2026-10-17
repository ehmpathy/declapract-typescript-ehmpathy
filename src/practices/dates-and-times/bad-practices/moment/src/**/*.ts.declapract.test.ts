import type { FileCheckContext } from 'declapract';
import { given, then, when } from 'test-fns';

import { check } from './*.ts.declapract';

/**
 * .what = clamps that the moment detection fires on an importer, and only on an importer
 * .teeth = the prior package.json check matched `JSON.stringify(contents)` (a string) against an
 *          object shape, so it detected no repo at all. here, drop the `import` or `require` arm
 *          of the regex and the matched [case1] row reddens.
 */
const context = {} as FileCheckContext; // the check reads no context

const isDetected = (contents: string | null) => {
  try {
    check(contents, context);
    return true;
  } catch {
    return false;
  }
};

const CASES_DETECTED = [
  { form: 'default import', contents: "import moment from 'moment';\n" },
  { form: 'named import', contents: 'import { duration } from "moment";\n' },
  { form: 'side-effect import', contents: "import 'moment';\n" },
  { form: 'require', contents: "const moment = require('moment');\n" },
];
const CASES_CLEAN = [
  { form: 'absent file', contents: null },
  { form: 'iso-time import', contents: "import { now } from 'iso-time';\n" },
  { form: 'moment-timezone', contents: "import tz from 'moment-timezone';\n" },
  { form: 'the word in prose', contents: '// at the moment, no dates here\n' },
];

describe('dates-and-times moment', () => {
  given('[case1] a source file that imports moment', () => {
    CASES_DETECTED.forEach(({ form, contents }) =>
      when(`[t0] via ${form}`, () => {
        then('the check detects it', () => {
          expect(isDetected(contents)).toBe(true);
        });
      }),
    );
  });

  given('[case2] a source file that does not import moment', () => {
    CASES_CLEAN.forEach(({ form, contents }) =>
      when(`[t0] via ${form}`, () => {
        then('the check throws: not detected', () => {
          expect(() => check(contents, context)).toThrow('does not match bad practice');
        });
      }),
    );
  });
});
