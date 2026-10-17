# F71 — #540: the gitignore line model

- **fork:** (a) read CRLF, emit LF; a comment binds to the line below it and sorts with it; blank
  lines between groups kept; (b) keep the flat sort and only strip `\r`.
- **taken:** (a). (b) still tears a comment from the rule it explains.
- **rework:** clean — one util, one test suite.
- **confidence 70%, low because:** a trailer comment (after its rule) binds the wrong way.
- **where:** `src/utils/defineExpectedGitignoreContents.ts:66-83`.
- **verdict:** —
