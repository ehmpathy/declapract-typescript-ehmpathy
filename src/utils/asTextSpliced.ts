import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a text span to swap, by offset into the original contents.
 */
export interface TextSplice {
  start: number;
  end: number;
  text: string;
}

/**
 * .what = the contents with each splice applied, last offset first so earlier offsets hold.
 * .why  = every splice is computed against the original text, so they must land back to front;
 *         the edit touches only its own span, so every comment and layout choice elsewhere stays.
 */
export const asTextSpliced = (input: {
  contents: string;
  splices: TextSplice[];
}): string => {
  const splicesBackToFront = [...input.splices].sort(
    (a, b) => b.start - a.start,
  );

  // two spans that overlap would cut each other's text, so the edit fails loud instead
  const overlap = splicesBackToFront.find(
    (splice, index) =>
      index > 0 && splice.end > splicesBackToFront[index - 1]!.start,
  );
  if (overlap)
    throw new MalfunctionError('text splices overlap', {
      splices: splicesBackToFront,
    });

  return splicesBackToFront.reduce(
    (out, splice) =>
      out.slice(0, splice.start) + splice.text + out.slice(splice.end),
    input.contents,
  );
};
