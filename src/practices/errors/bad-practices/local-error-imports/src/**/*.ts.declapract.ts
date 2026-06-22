// eslint-disable-next-line import/no-extraneous-dependencies
import type { FileCheckFunction, FileFixFunction } from 'declapract';
import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * known error classes exported by helpful-errors
 *
 * only these classes should be rewritten — custom error classes
 * (e.g., UserInputError, HumanGuidanceError) must be left alone
 */
const KNOWN_CLASSES = [
  'UnexpectedCodePathError',
  'BadRequestError',
  'HelpfulError',
  'MalfunctionError',
  'ConstraintError',
];

/**
 * pattern source for local imports that end with a known error class name
 *
 * anchored to line start via ^ with multiline flag (m)
 * supports both `import { X }` and `import type { X }`
 *
 * examples that match:
 *   import { UnexpectedCodePathError } from '../../utils/errors/UnexpectedCodePathError'
 *   import type { BadRequestError } from '@src/domain.operations/BadRequestError'
 *
 * examples that do NOT match:
 *   from 'helpful-errors' (already correct)
 *   from '../../utils/errors/UserInputError' (custom class)
 *   const msg = "import { X } from 'local/UnexpectedCodePathError'" (mid-line)
 *   // import { X } from '../../errors/UnexpectedCodePathError' (comment)
 */
const IMPORT_PREFIX = `(^\\s*import\\s+(?:type\\s+)?\\{[^}]+\\}\\s+)`;
const FROM_LOCAL_ERROR = `from ['"][^'"]*\\/(${KNOWN_CLASSES.join('|')})['"]`;
const LOCAL_ERROR_IMPORT_PATTERN_SOURCE = `${IMPORT_PREFIX}${FROM_LOCAL_ERROR}`;

/**
 * regex for test: match once, multiline mode
 */
const LOCAL_ERROR_IMPORT_PATTERN = new RegExp(
  LOCAL_ERROR_IMPORT_PATTERN_SOURCE,
  'm',
);

/**
 * regex for replace: match all occurrences, multiline mode
 */
const LOCAL_ERROR_IMPORT_PATTERN_GLOBAL = new RegExp(
  LOCAL_ERROR_IMPORT_PATTERN_SOURCE,
  'gm',
);

/**
 * .what = detect local error imports that should use helpful-errors
 * .why = flag files for fix by declapract
 */
export const check: FileCheckFunction = (contents) => {
  // matches bad practice if local error import found
  if (contents && LOCAL_ERROR_IMPORT_PATTERN.test(contents)) return;

  // no local error imports found — file does not need migration
  UnexpectedCodePathError.throw(
    'no local error imports found; file uses helpful-errors or custom errors',
    { hint: 'this file does not need migration to helpful-errors' },
  );
};

/**
 * .what = replace local error imports with helpful-errors
 * .why = consolidate error class sources for easier maintenance
 */
export const fix: FileFixFunction = (contents) => {
  // skip if empty
  if (!contents) return {};

  // replace all local error imports, preserve import prefix via $1
  return {
    contents: contents.replace(
      LOCAL_ERROR_IMPORT_PATTERN_GLOBAL,
      "$1from 'helpful-errors'",
    ),
  };
};
