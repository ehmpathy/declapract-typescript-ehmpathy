# F109 — provision-github visibility fails closed

- **fork:** (a) keep `pkg.private === true ? 'private' : 'public'` — an absent key yields public;
  (b) flip to `pkg.private === false ? 'public' : 'private'` — public only by an explicit opt-in.
- **taken:** (b). the wisher ruled it: privacy is top priority, and a repo is public only when
  someone ready to fullsun that domain says so (S24).
- **the cost:** an extant public repo whose `package.json` omits `private` goes private on its next
  provision apply. that is the safe direction; the fix is one line, `"private": false`, and the
  pr body names it.
- **rework:** clean — one expression in one template.
- **confidence 95%** — ruled by the wisher.
- **where:** `src/practices/provision-github/best-practice/provision/github.repo/resources.ts`;
  `rule.forbid.fail-open-publicity`.
- **verdict:** (b), ruled by the wisher.
