# declapract-typescript-ehmpathy

Declared best practices for TypeScript projects.

Sync your projects with the latest and greatest best practices with codemods powered by [declapract](https://github.com/ehmpathy/declapract).

## What is this?

This package contains battle-tested TypeScript best practices from the [ehmpathy org](https://github.com/ehmpathy), packaged for automated enforcement via codemods through [declapract](https://github.com/ehmpathy/declapract).

Instead of adhoc configuration of linters, formatters, test frameworks, cicd pipelines, and infrastructure for every project, this package provides:

- **40+ declared practices** covering TypeScript development, testing, CI/CD, AWS infrastructure, and more
- **Automated checking** to verify your repo follows best practices - and avoids bad practices
- **Automatic fixes** for most common issues
- **Project templates** to bootstrap new projects with everything configured

## How to use it?

### 1. Install declapract

```sh
npm install --save-dev declapract
```

### 2. Configure your project

Create `declapract.use.yml` in your repo:

```yml
declarations: npm:declapract-typescript-ehmpathy
useCase: typescript-project # Choose from: typescript-project, npm-package, lambda-service, lambda-service-with-rds, lambda-service-with-dynamodb, app-react-native-expo
variables:
  organizationName: 'my-org'
  projectName: 'my-project'
  infrastructureNamespaceId: 'prod-abc123'
  slackReleaseWebHook: 'https://hooks.slack.com/...'
```

### 3. Plan changes

```sh
# plan all practices
declapract plan

# or scope to one
declapract plan --practice
```

### 4. Apply changes

```sh
# apply all practices
declapract apply

# or scope to one
declapract apply --practice
```

## Benefits

### Consistency
All projects follow the same patterns, making it easy to switch between codebases

### Quality
Enforced best practices catch issues before code review

### Speed
Bootstrap new projects in minutes instead of hours

### Maintenance
Update best practices across all repos by updating one dependency

### Documentation
Practices are explicitly declared and versioned, serving as living documentation

## What use cases are supported?

This package defines complete sets of practices for common project types:

### `typescript-project`
Base configuration for any TypeScript project (18 core practices)

### `npm-package`
TypeScript packages published to npm (adds CI/CD for publishing)

### `lambda-service`
AWS Lambda microservices (adds AWS infrastructure, handlers, config, logging)

### `lambda-service-with-rds`
Lambda services with PostgreSQL database (adds RDS provisioning and DAOs)

### `lambda-service-with-dynamodb`
Lambda services with DynamoDB (adds DynamoDB DAOs)

### `app-react-native-expo`
React Native mobile apps with Expo

## What practices are included?

### Core TypeScript Development
- **typescript** - Strict TypeScript configuration
- **lint** - ESLint with TypeScript rules (airbnb-typescript)
- **format** - Prettier configuration
- **domain** - Domain-driven design with `domain-objects`
- **directory-structure-src** - Consistent project structures
- **runtime-type-checking** - Type-safe validation with `domain-objects`
- **errors** - Structured error handling with `helpful-errors`
- etc

### Tests & Quality
- **tests** - Jest configuration for unit, integration, and acceptance tests
- **conventional-commits** - Enforced commit message standards
- **husky** - Git hooks for pre-commit validation
- etc

### CI/CD
- **cicd-common** - GitHub Actions workflows for testing
- **cicd-package** - Publishing workflows for npm packages
- **cicd-service** - Deployment workflows for services

### AWS Lambda Services
- **lambda-handlers** - Standard Lambda function structure
- **lambda-clients** - Type-safe Lambda client wrappers
- **config** - Environment configuration with AWS Parameter Store
- **logs** - Structured logging with `simple-log-methods`
- **uuid** - UUID generation standards
- etc

### Infrastructure
- **terraform-common** - Common Terraform patterns
- **terraform-aws** - AWS-specific Terraform modules
- **declastruct-github** - GitHub repository configuration
- **environments-aws** - Multi-environment setup (dev/test/prod)
- etc

### Persistence
- **persist-with-rds** - PostgreSQL with `sql-dao-generator`
- **persist-with-dynamodb** - DynamoDB DAO patterns

### React Native
- **app-react-native-expo** - Expo app configuration
- **lint-react** - React-specific linting
- **lint-react-native** - React Native linting

## Learn more

- [declapract documentation](https://github.com/ehmpathy/declapract)
- [full list of practices](./src/practices)
- [full list of usecases](./src/useCases.yml)
