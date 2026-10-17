# F73 — #514: the husky secret scan

- **fork:** (a) a hand-rolled `check.secrets.sh` over staged blobs (key-shape regexes); (b) gitleaks.
- **taken:** (a). gitleaks is a host binary — the bare-host-dep class #645 removed.
- **rework:** clean — swap the scanner.
- **confidence 80%, low because:** a regex set misses shapes gitleaks knows.
- **where:** `husky/best-practice/.husky/check.secrets.sh`, `pre-commit`.
- **verdict:** —
