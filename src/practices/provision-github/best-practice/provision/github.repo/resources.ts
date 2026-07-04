import type { DeclastructProvider } from 'declastruct';
import {
  type DeclaredGithubBranch,
  DeclaredGithubBranchProtection,
  DeclaredGithubEnvironment,
  DeclaredGithubRepo,
  DeclaredGithubRepoConfig,
  DeclaredGithubRepoRuleset,
  DeclaredGithubTeamRepoAccess,
  getDeclastructGithubProvider,
} from 'declastruct-github';
import { type DomainEntity, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';

import pkgJson from '../../package.json';

const pkg = pkgJson as {
  description?: string;
  private?: boolean;
  homepage?: string;
};

export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructGithubProvider(
    {
      credentials: {
        token:
          process.env.GITHUB_TOKEN ??
          UnexpectedCodePathError.throw('github token not supplied'),
      },
    },
    {
      log: {
        info: () => {},
        debug: () => {},
        warn: console.warn,
        error: console.error,
      },
    },
  ),
];

export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // declare the repo
  const repo = DeclaredGithubRepo.as({
    owner: '@declapract{variable.organizationName}',
    name: '@declapract{variable.projectName}',
    description: pkg.description ?? null,
    visibility: pkg.private === true ? 'private' : 'public',
    private: pkg.private ?? false, // todo: why do we have to specify this twice?
    homepage: pkg.homepage ?? null,

    // things we haven't changed from the defaults
    archived: false,
  });

  // ref the main branch
  const branchMain = RefByUnique.as<typeof DeclaredGithubBranch>({
    name: 'main',
    repo,
  });

  // declare config for the repo
  const repoConfig = DeclaredGithubRepoConfig.as({
    repo,

    // explicitly set the main branch
    defaultBranch: branchMain.name,

    // we only use issues; the rest is noise today
    hasIssues: true,
    hasProjects: false,
    hasWiki: false,
    isTemplate: false,

    // only squash merges are allowed
    allowSquashMerge: true,
    allowMergeCommit: false, // but especially not merge merges. never merge merges
    allowRebaseMerge: false,

    // allow nice to haves for pulls
    allowAutoMerge: true,
    allowUpdateBranch: true,

    // always cleanup after yourself
    deleteBranchOnMerge: true,

    // configure messages
    mergeCommitMessage: 'PR_TITLE',
    mergeCommitTitle: 'MERGE_MESSAGE',
    squashMergeCommitMessage: 'COMMIT_MESSAGES',
    squashMergeCommitTitle: 'COMMIT_OR_PR_TITLE',
    webCommitSignoffRequired: false,
  });

  // declare protection for that branch, too
  const branchMainProtection = DeclaredGithubBranchProtection.as({
    branch: branchMain,

    enforceAdmins: true, // yes, even admins need to follow this (note: they can still take the time to go and change the settings temporarily for the exceptions)
    allowsDeletions: false, // dont allow the `main` branch to be deleted
    allowsForcePushes: false, // dont allow `main` branch to be force pushed to
    requireLinearHistory: false, //  # no ugly merge commits, woo! 🎉

    requiredStatusChecks: {
      strict: true, // branch must be up to date. otherwise, we dont know if it will really pass once it is merged
      contexts: [
        'suite / install / pnpm',
        'suite / enshard',
        'suite / test-commits',
        'suite / test-types',
        'suite / test-format',
        'suite / test-lint',
        'suite / test-unit',
        'suite / test-integration',
        'suite / test-acceptance-locally',
        'pullreq-title', // "review / pullreq-title",
      ],
    },

    // things we haven't changed from the defaults
    allowForkSyncing: false,
    blockCreations: false,
    lockBranch: false,
    requiredConversationResolution: false,
    requiredPullRequestReviews: null,
    requiredSignatures: false,
    restrictions: null,
  });

  // grant releasers team access to the repo (required before they can be environment reviewers)
  const teamReleasersAccess = DeclaredGithubTeamRepoAccess.as({
    team: { org: { login: '@declapract{variable.organizationName}' }, slug: 'releasers' },
    repo,
    permission: 'push', // write access needed to deploy
  });

  // declare environment for production deployments from main (auto-approved)
  const envProductionOnMain = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-main',
    reviewers: null, // no approval required — PR merge is the gate
    waitTimer: null, // no delay
    deploymentBranchPolicy: { customBranches: ['main'] }, // only main branch
    preventSelfReview: false,
  });

  // declare environment for production deployments from other branches (requires approval)
  const envProductionOnElse = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-else',
    reviewers: { users: null, teams: ['releasers'] },
    waitTimer: null, // no delay once approved
    deploymentBranchPolicy: null, // any branch
    preventSelfReview: false, // self-approval allowed if in reviewers list
  });

  // restrict who may cut `v*` release tags to the rhelease app only
  // .why = prod apply is gated on a version tag cut from main; if anyone could push a
  //        `v*` tag, that gate is bypassable. this ruleset blocks creation, update, and
  //        deletion of `v*` tags for everyone except the rhelease app — the github half
  //        of the prod-apply oidc guarantee, and the immutability of released tags
  const rulesetReleaseTags = DeclaredGithubRepoRuleset.as({
    repo,
    name: 'protect-release-tags',
    target: 'tag',
    enforcement: 'active',

    // only the rhelease github app may write `v*` tags
    bypassActors: [
      {
        actorId: 2472031, // rhelease github app id (gh api /apps/rhelease)
        actorType: 'Integration',
        bypassMode: 'always',
      },
    ],

    // applies to release tags only
    conditions: {
      refNameInclude: ['refs/tags/v*'],
      refNameExclude: [],
    },

    // enforce release-tag immutability: only the bypass actor may create, move, or delete
    // matched tags. a released `v1.2.3` must never be re-pointed or removed once cut
    rules: [{ type: 'creation' }, { type: 'update' }, { type: 'deletion' }],
  });

  // and return the full set
  return [
    repo,
    repoConfig,
    branchMainProtection,
    teamReleasersAccess, // must come before environments that reference this team
    envProductionOnMain,
    envProductionOnElse,
    rulesetReleaseTags,
  ];
};
