# F63 — #681/#641: one halt message for the timestamp hook

- **fork:** (a) #641's phrase alone, "timestamps are forbidden"; (b)
  `✋ ConstraintError: timestamps are forbidden in tracked files. mask them to prevent permadrift`.
- **taken:** (b). it carries the class #681 asks for, the scope both issues correct ("tracked
  files", not "snapshots"), and the fix the reader needs.
- **rework:** clean — one line plus a resnap.
- **confidence 75%, low because:** "tracked files" is wider than the true scope (staged files).
- **where:** `husky/best-practice/.husky/check.timestamps.sh`.
- **verdict:** —
