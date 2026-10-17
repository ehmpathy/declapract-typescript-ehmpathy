# F45 — #653: the template speaks `ACCESS`, not the adopter's `STAGE`

- **fork:** (a) set `STAGE=` as the reporter's file does; (b) set `ACCESS=`, the template's own term.
- **taken:** (b). the template's hot commands already set `ACCESS`, and `stage` is a forbidden term
  (`rule.forbid.stage-term`). an app that still reads `STAGE` belongs to the stage→access retirement.
- **rework:** clean.
- **confidence 80%, low because:** the reporter's app may read only `STAGE`, so the fix lands and
  the cold build still reaches prod there until that app moves.
- **where:** `cicd-app-react-native-expo/best-practice/package.json`.
- **verdict:** —
