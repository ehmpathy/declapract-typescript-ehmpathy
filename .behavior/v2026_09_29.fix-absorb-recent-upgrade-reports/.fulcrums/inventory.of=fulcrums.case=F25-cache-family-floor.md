# F25 — #625: floors plus an unfloored-member bad-practice

- **fork:** add the absent floors only, or also a bad-practice that flags any cache-family dep
  outside the floored set.
- **taken:** both. floors for `with-domain-driven-cache` and its old name (`.ifInstalled()`); the
  bad-practice maps renamed legacy names to successors and flags unknown members; a repo test keeps
  the floored set and the known set equal.
- **rework:** clean — each half is one file.
- **confidence 75%, low because:** the family regex may catch a third-party package by name; the
  bad-practice flags, it never deletes an unknown member.
- **where:** `cache/best-practice/package.json`; `cache/bad-practices/unfloored-cache-member/`.
- **verdict:** stands; the with-domain-driven-cache release is a caught dream (seed S5).
