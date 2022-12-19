import { createGetVariables } from 'declapract';

export const getProjectVariables = createGetVariables({
  organizationName: 'awesum',
  projectName: 'svc-awesome-thing',
});

export const getServiceVariables = createGetVariables({
  infrastructureNamespaceId: 'abcde12345',
  slackWebhookUrl: 'https://...',
  awsAccountId: {
    dev: '123abc',
    prod: '456def',
  },
});

export const getRdsVariables = createGetVariables({
  databaseName: 'awesomethingdb',
  databaseClusterHost: {
    dev: 'awesomesdb.cluster-abc123.us-east-1.rds.amazonaws.com',
    prod: 'awesomesdb.cluster-def456.us-east-1.rds.amazonaws.com',
  },
  databaseUserName: {
    serviceUser: 'svc_awesome_thing_user',
    cicdUser: 'awesomethingdb_cicd',
  },
});
