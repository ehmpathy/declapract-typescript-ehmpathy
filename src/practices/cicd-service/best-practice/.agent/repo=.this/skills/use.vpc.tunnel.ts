#!/bin/bash
//bin/true && exec npx declastruct apply --plan yolo --wish "$0"
//
// SKILL: use.vpc.tunnel
//
// Opens a secure VPC tunnel to the ahbodedb database cluster via AWS SSM.
//
// What it does:
//   1. Creates an SSM tunnel through the vpc-main-bastion to the database cluster
//   2. Binds the tunnel to localhost:$port
//   3. Adds a /etc/hosts alias so the database can be reached via a friendly hostname
//
// When to use:
//   - Before acceptance tests that need remote database access
//   - When you need to connect to the database locally
//   - Any time local code needs to reach an RDS cluster in the VPC
//
// Usage:
//   Direct execution:  ./.agent/repo=.this/skills/use.vpc.tunnel.ts
//   Via declastruct:   npx declastruct apply --plan yolo --wish .agent/repo=.this/skills/use.vpc.tunnel.ts
//
// Prerequisites:
//   - AWS credentials configured with SSM access
//   - sudo access (for /etc/hosts modification), if not already set
//
// Why via declastruct:
//   Declastruct enables declarative instructions — you specify *what* you want
//   (a tunnel, a host alias) rather than *how* to get it (spawn ssm-proxy, edit
//   /etc/hosts, track PIDs, cleanup, etc...). The runtime diffs current vs desired state
//   and applies only necessary changes. This makes skills more intuitive and
//   maintainable, as well as idempotent and safe to run repeatedly.
//
import { DeclastructProvider } from 'declastruct';
import {
  DeclaredAwsVpcTunnel,
  getDeclastructAwsProvider,
} from 'declastruct-aws';
import {
  DeclaredUnixHostAlias,
  getDeclastructUnixNetworkProvider,
} from 'declastruct-unix-network';

import { getConfig } from '../../../src/utils/config/getConfig';

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log: console }),
  await getDeclastructUnixNetworkProvider({}, { log: console }),
];

export const getResources = async () => {
  // grab the config
  const config = await getConfig();

  // open the tunnel
  const tunnel = DeclaredAwsVpcTunnel.as({
    via: {
      mechanism: 'aws.ssm',
      bastion: { exid: 'vpc-main-bastion' },
    },
    into: {
      cluster: { name: 'ahbodedb' },
    },
    from: {
      host: 'localhost',
      port: config.database.tunnel.local.port,
    },
    status: 'OPEN',
  });

  // bind the host alias
  const hostAlias = DeclaredUnixHostAlias.as({
    via: '/etc/hosts',
    from: config.database.tunnel.local.host,
    into: '127.0.0.1',
  });

  // instruct to set each
  return [tunnel, hostAlias];
};
