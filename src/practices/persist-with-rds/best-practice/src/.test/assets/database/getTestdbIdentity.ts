import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

/**
 * .what = read one value from git, in a dir
 */
const getGitValue = (input: { cwd: string; args: string[] }): string =>
  execFileSync('git', input.args, { cwd: input.cwd, encoding: 'utf8' }).trim();

/**
 * .what = this checkout's testdb identity: the suffix of its compose project and container, and
 *         the host port it binds
 * .why = two worktrees of one repo must never share one testdb, or an integration run in one
 *        reads or clobbers the rows of another, and a `start:testdb` in one stops the other's db
 * .note = ci and a main checkout keep the declared port and no suffix, so both behave as before.
 *         only a linked worktree derives its own, from a hash of its toplevel path, so the same
 *         worktree always lands on the same port
 * .note = the port offset spans 999 slots, so two linked worktrees can draw one port (~1 in 999
 *         per pair). that collision is loud, never shared: the suffix differs, so each worktree
 *         names its own compose project and volume, and docker refuses the second bind with
 *         `port is already allocated`. stop one worktree's testdb to start the other's
 */
export const getTestdbIdentity = (
  input: { portDeclared: number },
  context: { cwd: string; env: NodeJS.ProcessEnv } = {
    cwd: process.cwd(),
    env: process.env,
  },
): { suffix: string; port: number } => {
  // ci runs one checkout per job, so it keeps the declared port
  if (context.env.CI) return { suffix: '', port: input.portDeclared };

  // a main checkout keeps the declared port; only a linked worktree has a git dir of its own
  const gitDir = getGitValue({
    cwd: context.cwd,
    args: ['rev-parse', '--absolute-git-dir'],
  });
  const gitDirCommon = getGitValue({
    cwd: context.cwd,
    args: ['rev-parse', '--path-format=absolute', '--git-common-dir'],
  });
  if (gitDir === gitDirCommon) return { suffix: '', port: input.portDeclared };

  // derive the suffix and the port from the worktree's toplevel path
  const toplevel = getGitValue({
    cwd: context.cwd,
    args: ['rev-parse', '--show-toplevel'],
  });
  const hash = createHash('sha256').update(toplevel).digest('hex');
  const offset = 1 + (Number.parseInt(hash.slice(0, 8), 16) % 999);
  return { suffix: `-${hash.slice(0, 6)}`, port: input.portDeclared + offset };
};
