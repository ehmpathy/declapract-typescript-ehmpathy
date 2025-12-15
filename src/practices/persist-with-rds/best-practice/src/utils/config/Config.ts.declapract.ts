import { FileCheckType, type FileFixFunction } from 'declapract';
import { UnexpectedCodePathError } from 'helpful-errors';

export const check = FileCheckType.CONTAINS; // practice must contain this

const variantsToReplace = [
  `
  database: {
    service: {
      host: string;
      port: number;
      database: string;
      schema: string;
      username: string;
      password: string;
    };
  };
  `.trim(),
];

export const fix: FileFixFunction = (contents, context) => {
  // if no contents yet, can't fix
  if (!contents) return { contents };

  // otherwise, try and fix with one of the variants we support
  const desiredContents = variantsToReplace.reduce(
    (contentsNow, thisVariant) =>
      contentsNow?.replace(
        thisVariant,
        context.declaredFileContents?.trim() ??
          UnexpectedCodePathError.throw(
            'expected to have declared best practice but found null',
            { context },
          ),
      ),
    contents,
  );
  return { contents: desiredContents };
};
