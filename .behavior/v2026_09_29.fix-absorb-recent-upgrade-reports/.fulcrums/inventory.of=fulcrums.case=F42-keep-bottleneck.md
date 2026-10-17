# F42 — #663: keep `bottleneck` while src imports it

- **fork:** (a) swap `bottleneck` for `with-bottleneck` outright; (b) add `with-bottleneck` 0.1.2,
  keep `bottleneck` while any src file imports it.
- **taken:** (b). (a) is the #642/#643 class: a dep removed under a live import.
- **rework:** clean.
- **confidence 80%, low because:** the import scan may miss a dynamic require.
- **where:** the practice that declares `with-bottleneck`.
- **verdict:** —
