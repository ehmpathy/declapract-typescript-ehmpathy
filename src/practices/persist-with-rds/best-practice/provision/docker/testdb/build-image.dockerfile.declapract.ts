import type { FileCheckFunction, FileFixFunction } from 'declapract';

const POSTGRES_PIN_LINE = /^FROM postgres:\S+$/m;

/**
 * .what = the declared image, with the repo's own postgres pin kept in place of the template's
 * .why = each repo pins the testdb to its own livedb's major, and the majors differ across the
 *        fleet. an exact compare would move every testdb onto the template's pin, which lands
 *        some ahead of their livedb — the skew where a suite passes on sql the livedb rejects.
 *        check-engine-skew.sh guards that the pin never leads the livedb (#664)
 */
const asDeclaredWithPinFound = (input: {
  declared: string;
  found: string | null;
}): string => {
  const pinFound = input.found?.match(POSTGRES_PIN_LINE)?.[0];
  if (!pinFound) return input.declared;
  return input.declared.replace(POSTGRES_PIN_LINE, pinFound);
};

export const check: FileCheckFunction = (contents, context) => {
  const expected = asDeclaredWithPinFound({
    declared: context.declaredFileContents!,
    found: contents,
  });
  if (contents === expected) return; // the image matches, whatever postgres major it pins
  throw new Error(
    'best practice violated: build-image.dockerfile must match the template, with any `FROM postgres:<version>` pin',
  );
};

export const fix: FileFixFunction = (contents, context) => ({
  contents: asDeclaredWithPinFound({
    declared: context.declaredFileContents!,
    found: contents,
  }),
});
