# define.sdk-environment-shape

## .what

the org has formally cut over to **sdk-environment** as the single source of truth for
environment resolution. code reads its environment via `getEnvironment` and speaks the
`{ access, config, server, commit }` ubiqlang shape — never raw `process.env` soup.

```ts
import { getEnvironment } from 'sdk-environment';

const { access } = getEnvironment.static();   // sync, cached
// or, when async parsers are needed:
const env = await getEnvironment.filled();    // Promise<Environment>
```

## .the shape

`getEnvironment` returns an `Environment`:

| field | type | .what |
| ----- | ---- | ----- |
| `access` | `test \| prep \| prod` | which tier of **resources** this process may touch |
| `config` | config slug (`test*`/`prep*`/`prod*`) | which config/secrets to load |
| `server` | `` local@${string} \| cloud@${string} `` | where the process **executes** |
| `commit` | commit slug | what code the process runs |

the two that matter most day-to-day:

- **`access`** — the resource tier. this is THE ubiqlang term for "which environment"
  in the tier sense (test/prep/prod). it replaces ad-hoc `stage` / `ENVIRONMENT` / `NODE_ENV`
  reads.
- **`server`** — orthogonal to access: WHERE the code runs (`local@…` dev laptop vs
  `cloud@…` lambda), not which resources it reaches. a `local@…` server can hold
  `access=prep`. keep the two axes distinct.

## .why the cutover

- **one vocabulary.** `access` (test/prep/prod) is the org-standard tier term everywhere:
  code, config schema (`environment.access`), workflows (the `ACCESS` envar). no more
  `stage` vs `ENVIRONMENT` vs `NODE_ENV` drift.
- **two axes, not one.** access (which resources) and server (where it runs) are
  independent. the old single `stage` conflated them; sdk-environment separates them.
- **no env-var soup.** consumers read a typed `Environment`, not scattered
  `process.env.X ?? throw` one-offs. resolution logic (parsers, precedence, validation)
  lives in sdk-environment, tested once.

## .the wire-up contract

| layer | does | not |
| ----- | ---- | --- |
| workflows | set the `ACCESS` envar (job-level `env: ACCESS: …`) | inline `ACCESS=… cmd` prefixes |
| code | read `getEnvironment.static()` / `.filled()` | `process.env.ACCESS ?? throw` |
| config schema | key env under `environment.access` | flat `stage` / `env` fields |

sdk-environment's default parser chain derives `access` from `ACCESS` → aws account
alias/name → `NODE_ENV`, so a workflow that sets the `ACCESS` envar gives the canonical
signal.

## .relation to the dev↔prep legacy label

`access` speaks the application vocab (`test`/`prep`/`prod`). some **infrastructure**
resource NAMES still carry the legacy `dev` label (terraform's `var.environment`), so a
prep-access process reads/writes params whose names contain literal `dev`. that
name-level cast (prep→dev) is a separate concern — see
`define.infrastructure-dev-vs-application-prep`. sdk-environment's `access` never carries
`dev`; the cast happens only where a live infra NAME demands it.

## .exemplars (in this repo's templates)

- `src/practices/environments/best-practice/src/utils/environment.ts` — the paved
  re-export: `envStatic = getEnvironment.static()`, `stage = envStatic.access`.
- `src/practices/persist-with-rds/best-practice/provision/aws/resources.parameters.ts`
  — a declastruct wish that reads `const { access } = getEnvironment.static()`.
- `src/practices/cicd-common/best-practice/.github/workflows/.declastruct.yml`
  — the aws-auth path sets job-level `env: ACCESS: ${{ inputs.access }}` so the wish
  resolves via sdk-environment.

## .see also

- `define.infrastructure-dev-vs-application-prep` — the dev↔prep name bridge for infra
- package: `sdk-environment` (ehmpathy) — `getEnvironment`, `Environment`,
  `EnvironmentAccessTier`
