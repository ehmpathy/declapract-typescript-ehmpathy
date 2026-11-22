# F1 · measure on this repo, not a larger consumer

- fork: probe this repo (220–267 `*.declapract.ts` files in typecheck scope, per whether tsc's `**` enters dot-dirs), or clone a larger consumer (a lambda service) into a temp dir and probe there.
- taken: this repo. it takes its own practices (devDep `declapract-typescript-ehmpathy@0.50.0`, tsconfig mirrors typescript-node), the pr lands here, ci can re-run the read, and the cross-repo-access guard fences off adhoc reads of peer clones.
- split: this repo covers the typecheck seam only; its build is `declapract compile`. the build seam (emit diff, `tsc-alias`) is read in the consumer repo `rhx declapract.walk --usecase lambda-service` builds in a temp dir.
- rework: clean. the probe is one command over a tsconfig; a second repo adds a table row and changes no practice file.
- confidence 75%, why low: a small project understates the speedup, since fixed startup weighs more. the ratio may read lower than the 8–12× microsoft cites for vscode/sentry.
- where: `1.vision.yield.md` · groundwork.
- verdict: —

