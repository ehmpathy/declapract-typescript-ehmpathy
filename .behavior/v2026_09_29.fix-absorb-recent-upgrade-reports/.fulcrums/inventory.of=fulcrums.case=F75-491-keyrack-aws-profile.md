# F75 — #491/#487: where AWS_PROFILE is declared in keyrack.yml

- **fork:** (a) the rhachet `keyrack.yml` becomes a usecase-aware findsert that adds `AWS_PROFILE`
  (`is-optional-if-has`) under `env.all` when an aws practice is in play; (b) a second declarer in
  an aws practice.
- **taken:** (a). one owner per file; a findsert is scope-safe (`rule.avoid.runtime-forks`).
- **rework:** clean.
- **confidence 75%, low because:** an adopter's hand-shaped keyrack.yml may hold AWS_PROFILE under
  a tier key the findsert does not read.
- **where:** `rhachet/best-practice/.agent/keyrack.yml.declapract.ts` (EXISTS today).
- **verdict:** —
