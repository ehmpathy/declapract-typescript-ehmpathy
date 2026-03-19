# self-review r3: has-consistent-conventions

## convention audit

### convention 1: directory names

**extant convention:** `.slowtest/` follows the pattern of `.temp/`, `.artifact/`, `.terraform/` — hidden directories for generated artifacts.

**our choice:** `.slowtest/integration.report.json`

**aligned?** yes — follows the dot-prefix pattern for generated artifact directories.

### convention 2: file names

**extant convention:** report files use `{type}.report.{format}` pattern.

**our choice:** `integration.report.json`

**aligned?** yes — `{test-type}.report.json` follows the pattern.

### convention 3: reporter names

**extant convention:** jest reporters use package path format: `package-name/reporter-name`.

**our choice:** `test-fns/slowtest.reporter.jest`

**aligned?** yes — follows the `{package}/{reporter-name}` pattern.

### convention 4: option names

**extant convention:** the slowtest reporter uses `slow` and `output` options.

**our choice:** `{ slow: '10s', output: '.slowtest/integration.report.json' }`

**aligned?** yes — uses the exact option names from the test-fns API.

### convention 5: threshold values

**extant convention:** test-fns uses string duration format like `'10s'`.

**our choice:** `slow: '10s'`

**aligned?** yes — matches the duration format from test-fns documentation.

### convention 6: version directive format

**extant convention:** `@declapract{check.minVersion('x.y.z')}`

**our choice:** exact same format

**aligned?** yes — identical to all other dependencies.

---

## name consistency check

| name | extant pattern | our choice | aligned? |
|------|----------------|------------|----------|
| `.slowtest/` | `.{artifact}/` | `.slowtest/` | yes |
| `integration.report.json` | `{type}.report.json` | yes | yes |
| `test-fns/slowtest.reporter.jest` | `{pkg}/{reporter}` | yes | yes |
| `10s` | duration string | `10s` | yes |

---

## conclusion

all names and conventions align with extant patterns. no divergence found.

### why it holds

1. **directory name**: follows dot-prefix pattern for artifacts
2. **file name**: follows `{type}.report.{format}` pattern
3. **reporter path**: follows jest reporter path convention
4. **duration format**: matches test-fns API
5. **directive syntax**: identical to extant dependencies
