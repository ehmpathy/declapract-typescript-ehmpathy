import type { FileCheckFunction, FileFixFunction } from 'declapract';

import { asTemplateFingerprint } from '../../../../../../../utils/asTemplateFingerprint';

/**
 * .what = the fingerprint of every body persist-with-rds ever shipped at this path
 * .why = the fix deletes the file only when the repo still holds one of these bodies; an adopter's
 *        edit must never be dropped silently. one per template revision, 2021-08 through 2026-05,
 *        each proven by a fixture in this bad-practice's `.test/assets/old-templates/`
 * .note = ten revisions, eight fingerprints: 66284e3 → d1e8cd7 → ef25ae0 were format-only changes
 */
export const OLD_TEMPLATE_FINGERPRINTS: string[] = [
  '4652212f6406f8245aec5c8595975b1bb60a0f18b0191af5c5943fa40b372e7d', // 66284e3, d1e8cd7, ef25ae0
  'c4382197566f98a406536c74c34637ddd93d894fa69e6608a6a665599fe46a9f', // 3a193e5
  'a6b220f1ffffb81c1d793744be5c4324f401e45e1bc2c5b8d2f88525e04118e3', // 9e1bdc4
  'ef6e06c5aaafbee194a5e209178b6b1e40a57f5870fd76f7ac33aa108d3a653e', // c6cef7e
  'e38f23c3ef7b148ae1974001e65e05f1f92ebcb5eade23974ac6de40df68cbd7', // eab15c0
  '8b1ffaa9a42d778b7a8ca07bda6cc7d405665aa44a02aec15379992d6e57970d', // c8eb35b
  '0283efcee1fc208d125a24fe1c101599cecad67828a33108b2fa8c8a849b71d7', // 68cf8ba
  '6871c674157bb59da937231cf8aac7e17e3c34a0c2e59c580fcf33e2709a64f2', // e0c53d8
];

/**
 * .what = the review pointer stamped above an edited copy
 * .why = an edited copy is kept, so `plan` stays red; the pointer names what a human must do
 */
const REVIEW_MARKER =
  '// @declapract:review: getDatabaseConnection.ts is retired — its importers now read getOneDatabaseConnection. move any local edit into getOneDatabaseConnection.ts, then delete this file';

export const check: FileCheckFunction = (contents) => {
  if (contents !== null) return; // bad practice detected: the retired factory is still here
  throw new Error(
    'does not match bad practice: getDatabaseConnection.ts is absent',
  );
};

export const fix: FileFixFunction = (contents) => {
  if (contents === null) return { contents };

  // delete the file when it is still a template the practice shipped
  const fingerprint = asTemplateFingerprint({ source: contents });
  if (OLD_TEMPLATE_FINGERPRINTS.includes(fingerprint))
    return { contents: null };

  // otherwise keep the adopter's edit, and stamp the pointer once
  if (
    contents.includes('@declapract:review: getDatabaseConnection.ts is retired')
  )
    return { contents };
  return { contents: `${REVIEW_MARKER}\n${contents}` };
};
