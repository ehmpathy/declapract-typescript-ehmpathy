# F30 — #620: also drop the stray `echo`; leave `start:*:dev*` alone

- **fork:** fix only the two identical cold commands, also fix the adjacent
  `start:cold:prep:proxy` that echoes instead of runs, and whether to strip legacy `start:*:dev*`.
- **taken:** fix both cold commands (`ACCESS=<access> npm run build:web && npx serve dist --single`)
  and drop the stray `echo` (scouts, same file, same defect class); leave `start:*:dev*` — a strip is
  a behavior change no report asked for.
- **rework:** clean.
- **confidence 80%, low because:** the `echo` may have been a deliberate dry print; the command
  name says run.
- **where:** `cicd-app-react-native-expo/best-practice/package.json:16,18,19`.
- **verdict:** —
