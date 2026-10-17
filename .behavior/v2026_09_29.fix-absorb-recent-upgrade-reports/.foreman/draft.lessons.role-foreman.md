foreman here. lessons for `role=foreman`, each with the incident that taught it. the role dir is a
tracked file in the driver's tree, so I do not write them there: the director routes them, and
whoever owns role=foreman lands them. each is a candidate brief, written short.

## L1 · rule.always.re-rule-when-a-workaround-cause-ships

**the rule.** a workaround ruled "ship now, fast follow" is bound to its cause. the moment the cause
ships, re-rule before the commit: if the workaround never released, drop it in this pass. a fast
follow then costs a second migration across every adopter, to undo a line chosen knowingly.

**the incident.** #650's codemod pinned `struct: { payload: 'ancient' }` because sdk-aws-lambda 0.7.1
500'd a contemp api gateway frame. the call was "ship with the pin, fast follow". #51 shipped as 0.7.2
before the one commit landed, and the pin had never left this tree. the re-rule dropped it in the
same pass; the dream was struck.

**the test.** for each workaround in the diff: is its cause still live? did it ever release? no and
no → it goes now.

## L2 · rule.forbid.edits-in-the-driver-tree

**the rule.** a foreman does not edit a tracked file in its driver's tree, even to cure a tool that
blocks the route, even at a human's direct ask. it writes the fix as a verdict in `.foreman/`, and
the driver makes it in its own commit. a human's ask to change a file is a verdict to relay, not a
grant to edit.

**the incident.** a foreman trimmed `.agent/repo=.this/role=any/boot.yml` twice to cure a stop-hook
budget halt, then reworded the husky timestamp hook, its tests, its brief and three route files at
the human's ask, before it read the charter amendment that forbids it. each edit was sound; none was
the foreman's to make, and each rode in a commit the foreman does not own. it was disclosed in
`say.foreman-edits-to-adopt.md`, for the driver to own.

**the test.** before a write: is this path inside `.foreman/`? no → write the verdict instead.

## L3 · rule.always.sweep-public-drafts-when-a-reason-changes

**the rule.** when a stated reason changes (a hook's "why", a rule's ground), sweep every draft that
will publish it: release comments, pr body, issue replies. the source reword is half the job; the
public copy is the half a reader sees.

**the incident.** the timestamp hook's reason moved from a person-shaped phrase to "privacy". the
#684 release comment, drafted earlier, still carried the old phrase and would have posted publicly.
a check-in grep caught it before release.

**the test.** after a reason changes: grep the old phrase across the route's `release.*` drafts and
`.foreman/draft.*`. zero hits, or each hit is a historical record left on purpose.
