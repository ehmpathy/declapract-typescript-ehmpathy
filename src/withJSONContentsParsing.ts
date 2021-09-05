import { FileCheckFunction } from 'declapract';
import { FileCheckContext } from 'declapract/dist/domain/objects/FileCheckContext';

/**
 * used to create a file check function that expects parsed JSON content
 *
 * this wrapper simply takes the content and runs JSON parse for you - to abstract away common processing.
 *
 * for example:
 * ```ts
 * export const check: FileCheckFunction = withJSONContentsParsing(async (contents) => {
 *   expect(contents).toEqual(
 *     expect.objectContaining({
 *       license: expect.any(String), // we shouldn't have a license
 *     }),
 *   );
 * });
 * ```
 */
export const withJSONContentsParsing = (
  logic: (contents: Record<string, any> | null, context: FileCheckContext) => void | Promise<void>,
): FileCheckFunction => {
  const fileCheckFunction: FileCheckFunction = (contents, context) => {
    const parsedContents = JSON.parse(contents ?? 'null');
    logic(parsedContents, context);
  };
  return fileCheckFunction;
};
