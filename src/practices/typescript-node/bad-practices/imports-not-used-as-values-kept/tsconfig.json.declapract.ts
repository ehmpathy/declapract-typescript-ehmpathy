import type { FileCheckFunction } from 'declapract';

import { asJsoncView } from '../../../../utils/asJsoncView';
import { emitManualFixNoticeOnce } from '../../../../utils/emitManualFixNoticeOnce';
import { getOneJsoncCompilerOptionString } from '../../../../utils/getOneJsoncCompilerOptionString';

/**
 * .what = the `importsNotUsedAsValues` values whose drop would change what the repo emits or checks.
 * .why  = `preserve` keeps a `require` for each type-only import (a side effect a module may lean on);
 *         `error` fails the build on an import used only as a type. `remove` is the default, so only it
 *         drops with no change.
 */
const VALUES_KEPT_BY_INTENT = ['preserve', 'error'];

/**
 * .what = the treestruct notice that names the manual move for one value
 */
const asNotice = (input: { value: string }): string =>
  [
    `🟡 importsNotUsedAsValues "${input.value}" kept in tsconfig.json — typescript 7 rejects the option (TS5023)`,
    '   ├─ no automatic fix: a drop would change the build in silence',
    '   └─ remedy',
    "      ├─ for a module a type-only import loads for its side effect, add `import './x';` beside it",
    '      ├─ or, on an esm module, set "verbatimModuleSyntax": true',
    '      ├─ then delete importsNotUsedAsValues',
    '      └─ see typescript-node/bad-practices/imports-not-used-as-values-kept/.declapract.readme.md (declapract-typescript-ehmpathy)',
    '',
    '',
  ].join('\n');

/**
 * .what = flags a tsconfig whose `importsNotUsedAsValues` is `preserve` or `error`.
 * .why  = typescript 7 removed the option (TS5023), but each of these values asks for an emit or a check
 *         the default does not give. the right swap (a side-effect import, or `verbatimModuleSyntax`
 *         on an esm module) is a human's call, so this flags, names the move on stderr, and declares
 *         no fix.
 */
export const check: FileCheckFunction = (contents, context) => {
  const found = getOneJsoncCompilerOptionString({
    view: asJsoncView({ contents: contents ?? '' }),
    key: 'importsNotUsedAsValues',
  });
  if (found && VALUES_KEPT_BY_INTENT.includes(found.value)) {
    emitManualFixNoticeOnce({
      root: context.getProjectRootDirectory(),
      practice: 'imports-not-used-as-values-kept',
      notice: asNotice({ value: found.value }),
    });
    return; // bad practice detected
  }
  throw new Error(
    'does not match bad practice: no importsNotUsedAsValues "preserve" or "error"',
  );
};
