# rule.require.commit-msg-hook-ships

## .what

the commit-message hook is a hard requirement. every usecase that holds `husky` ships
`.husky/commit-msg` and `.husky/check.commit.sh`, and the `husky` practice owns both.

- `husky` owns every `.husky/` hook — the commit-msg hook among them
- `conventional-commits` owns what the hook checks against: `commitlint.config.js` and the
  commitlint deps. it ships no `.husky/` file

## .why

- **it is the one gate on the commit shape.** release-please derives the changelog and the next
  version from conventional commit headers. a repo with no commit-msg hook lets a malformed header
  merge, and the release reads it wrong.
- **a dedupe can drop it in silence.** two practices once shipped identical copies; a one-owner
  cleanup that deletes one copy leaves the hook one move away from absent, and no apply reports a
  file that no practice declares.
- **the hook belongs with the hooks.** a reader who looks for a git hook opens `husky`, never
  `conventional-commits`.

## .the test

does `husky` ship both hook files, and does every usecase with `husky` hold a practice that ships
them?

- yes → fine
- no → restore them in `husky/best-practice/.husky/`

## .enforcement

- a change that leaves a husky usecase with no `commit-msg` or `check.commit.sh` = **blocker**
- a commit hook shipped from a practice other than `husky` = **nitpick** (move it to `husky`)
- the clamp: `src/huskyCommitMsgHook.declapract.integration.test.ts`

## .see also

- `rule.require.entool-requests-as-practices` — the practice that owns a concern declares it
