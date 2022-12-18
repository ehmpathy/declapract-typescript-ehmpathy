# ehmpathy declapract typescript

this repo contains the [ehmpathy org's](github.com/ehmpathy) declared best practices for typescript, for usage with [declapract](https://github.com/ehmpathy/declapract)

# usage

1. add `declapract` to your repo
```sh
npm install --save-dev declapract
```

2. add a declapract usage config to your repo
```yml
# declapract.use.yml
declarations: npm:ehmpathy-declared-ehmpathy-declapract-typescript
useCase: lambda-service # specify which use case your repo is following, see `ehmpathy-declapract-typescript:src/useCases.yml` for options
variables: # specify the values of the variables to use against checks
  organizationName: 'awesome-org'
  serviceName: 'svc-awesome-thing'
  infrastructureNamespaceId: 'abcde12345'
  slackReleaseWebHook: 'https://...'
```

3. clone a declared best practices example, do bootstrap a new repo
```sh
declapract clone lambda-service-with-rds # bootstrap a new lambda-service-with-rds repo
```

4. check that your repo is conforming to best practices
```
declapract check
```

5. fix a specific practice that your repo is failing to conform to (if it has an automatic fix declared)
```sh
declapract fix --practice dates-and-times # e.g., apply a fix for the the dates-and-times practice
```
