import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { FileCheckType, FileFixFunction } from 'declapract';

export const check = FileCheckType.CONTAINS;

export const fix: FileFixFunction = (contents, { declaredFileContents }) =>
  !declaredFileContents
    ? UnexpectedCodePathError.throw('expected declared file contents to exist')
    : !contents
    ? { contents: [declaredFileContents.trim(), '}'].join('\n') }
    : {
        contents: contents.replace(
          'export interface Config {',
          declaredFileContents.trim(), // add the prefix
        ),
      };
