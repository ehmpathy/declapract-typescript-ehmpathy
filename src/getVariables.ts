import { createGetVariables } from 'declapract';

export const getProjectVariables = createGetVariables({
  organizationName: 'awesum',
  projectName: 'svc-awesome-thing',
  reviewers: { users: ['user1', 'user2'] },
});

export const getServiceVariables = createGetVariables({
  infrastructureNamespaceId: 'abcde12345',
  slackWebhookUrl: 'https://...',
  awsAccountId: {
    prep: '123abc',
    prod: '456def',
  },
});

export const getRdsVariables = createGetVariables({
  databaseName: 'awesomethingdb',
  databaseClusterHost: {
    prep: 'awesomesdb.cluster-abc123.us-east-1.rds.amazonaws.com',
    prod: 'awesomesdb.cluster-def456.us-east-1.rds.amazonaws.com',
  },
  databaseTunnelHost: {
    prep: 'aws.ssmproxy.awesomesdb.prep',
    prod: 'aws.ssmproxy.awesomesdb.prod',
  },
  databaseUserName: {
    serviceUser: 'svc_awesome_thing_user',
    cicdUser: 'awesomethingdb_cicd',
  },
});
