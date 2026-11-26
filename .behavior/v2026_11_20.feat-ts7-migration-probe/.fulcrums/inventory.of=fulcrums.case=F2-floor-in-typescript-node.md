# F2 · raise the floor in typescript-node, not typescript-any

- fork: raise `typescript` in typescript-any (shared by node + expo), or leave typescript-any at its floor and declare `typescript >= 7.0.2` in typescript-node.
- taken: typescript-node. expo sdk 56–58 `expo install --check` expects `typescript ~6.0.3` and fails ci on a ts7 install; a shared floor would push every expo repo into that failure.
- rework: clean. move one `minVersion` line between two practice `package.json` files.
- confidence 88%, why not higher: two practices then declare one key. a 7.0.2 install satisfies both `minVersion` checks, so no fix should fire, but convergence must be shown by `rhx declapract.walk` (no oscillation).
- where: `1.vision.yield.md` · case=3, case=5.
- verdict: —

