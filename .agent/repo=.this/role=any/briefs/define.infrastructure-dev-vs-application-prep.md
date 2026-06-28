# define.infrastructure-dev-vs-application-prep

## .what

infrastructure uses `dev`, application logic uses `prep`. the `accessByStage` mapping bridges the gap.

## .why

### semantic symmetry

`prep` (prepare, pre-production) describes what happens in the environment, not who uses it. `dev` describes who uses it (developers). for application logic, `prep` is clearer.

but infrastructure resource names are stateful:
- cloudformation stacks: `$service-dev`
- terraform state bucket keys: `projectname-dev`
- aws resources: tagged with `environment: dev`

to rename these requires careful migration of stateful resources (terraform state, cloudformation stacks). not worth the churn until we're ready to cutover to declastruct-aws.

**note:** terraform directory uses `prep/` for consistency with application layer, but the internal `environment = "dev"` value stays to preserve aws resource names.

### the mapping

serverless.yml uses `accessByStage` to bridge the gap:

```yaml
custom:
  accessByStage:
    dev: prep  # stage=dev deploys to $service-dev but uses ACCESS=prep
    prod: prod
```

- **stage=dev** → deploys to `$service-dev` stack
- **ACCESS=prep** → reads from `config/prep.json`, uses prep secrets

### where each naming is used

| layer | name | examples |
|-------|------|----------|
| infrastructure resources | `dev` | cloudformation stacks (`$service-dev`), aws tags |
| terraform directories | `prep` | `environments/prep/` (but `environment = "dev"` inside) |
| application | `prep` | ACCESS env var, config files, ssm param lookups |
| github | `prep` | github environments (where secrets/vars live) |
| workflows | `dev` | stage input option, deployment targets |

### the cutover path

when ready to migrate to declastruct-aws:
1. declastruct-aws will provision new `prep` infrastructure
2. migrate data from `dev` to `prep` resources
3. update workflows to use `stage=prep`
4. decommission old `dev` resources

until then, this mapping prevents breaking extant deployments while standardizing application logic on `prep`.

## .summary

infrastructure stays `dev` to avoid stateful resource churn. application logic uses `prep` for semantic clarity. `accessByStage` bridges the gap. this is a transitional state until declastruct-aws cutover.
