# F60 — #686: the role-rename copy is prose plus a marker

- **fork:** (a) the rename map in `provision/aws/readme.md` as a human step, plus a comment on each
  `removed{}` block whose label holds `admin`/`service` that names its target; (b) a bad-practice
  that detects `role.admin` in `config/*.json` before the merge erases it.
- **taken:** (a). a declapract fix holds no aws access, so the copy is a human step either way;
  (b) can only document, and runs in the same apply pass as the merge that erases its signal.
  the copy targets are #637's derived names, so a repo copies once.
- **rework:** clean — prose and one comment per forget block.
- **confidence 85%, low because:** the paved copy skill (ghlitch#129) is unshipped, so the prose
  names a manual `aws ssm` copy that a later release replaces.
- **where:** `persist-with-rds/best-practice/provision/aws/readme.md`,
  `persist-with-rds/best-practice/.declapract.readme.md`,
  `persist-with-rds/bad-practices/terraform-parameters/`.
- **verdict:** —
