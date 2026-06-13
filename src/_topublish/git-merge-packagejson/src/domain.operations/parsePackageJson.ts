import { BadRequestError } from 'helpful-errors';

/**
 * .what = parse package.json content with error context
 * .why = provide clear error messages that identify which branch has invalid json
 */
export const parsePackageJson = (input: {
  content: string;
  branch: 'base' | 'ours' | 'theirs';
}): Record<string, unknown> => {
  const { content, branch } = input;

  // handle empty content
  if (!content || content.trim() === '') {
    throw new BadRequestError(`empty content in '${branch}' branch`, {
      branch,
      content,
    });
  }

  // attempt to parse json
  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new BadRequestError(
      `invalid json in '${branch}' branch: ${error.message}`,
      {
        branch,
        content,
        parseError: error.message,
      },
    );
  }
};
