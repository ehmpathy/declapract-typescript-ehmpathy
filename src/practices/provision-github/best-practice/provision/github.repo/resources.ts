import type { DeclastructProvider } from 'declastruct';
import {
  type DeclaredGithubBranch,
  DeclaredGithubBranchProtection,
  DeclaredGithubEnvironment,
  type DeclaredGithubOrg,
  DeclaredGithubRepo,
  DeclaredGithubRepoConfig,
  DeclaredGithubRepoRuleset,
  type DeclaredGithubTeam,
  DeclaredGithubTeamRepoAccess,
  getDeclastructGithubProvider,
} from 'declastruct-github';
import { type DomainEntity, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

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
      // MUST be an sdk-logs logger — 1.6.0 DAOs read log._.level via as-procedure
      log: genLogMethods(),
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

  // ref the releasers team
  const teamReleasers = RefByUnique.as<typeof DeclaredGithubTeam>({
    org: RefByUnique.as<typeof DeclaredGithubOrg>({ login: '@declapract{variable.organizationName}' }),
    slug: 'releasers',
  });

  // grant the releasers team push access to the repo (standalone; no env depends on it)
  const teamReleasersRepoAccess = DeclaredGithubTeamRepoAccess.as({
    team: teamReleasers,
    repo,
    permission: 'push', // write access needed to deploy
  });

  // declare environment for production deployments from main (auto-approved)
  const envProductionOnMain = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-main',
    reviewers: null, // no approval required — PR merge is the gate
    waitTimer: null, // no delay
    deploymentBranchPolicy: {
      // accept both the main branch and `v*` release tags: prod deploys are
      // triggered by a release tag cut from main (see protect-release-tags
      // ruleset below), so the ref gate must admit that tag. a branch-only
      // policy would have the environment reject the tag-triggered deploy.
      // (requires declastruct-github >=1.7.2 for tag-target customPatterns.)
      customPatterns: [
        { name: 'main', target: 'branch' },
        { name: 'v*', target: 'tag' },
      ],
    },
    preventSelfReview: false,
  });

  // declare environment for adhoc production apply from a non-main branch
  // .why = github env "required reviewers" is Enterprise-only; on a private repo
  //        under the Free/Pro/Team plan the api returns 422 for BOTH team and user
  //        reviewers. so this env carries NO protection rule — the human gate lives
  //        in aws via an `actor_id` allowlist on this env's sts trust statement
  //        (declared org-wide in aws.auth). do NOT add `reviewers` here (it will 422 on apply).
  const envProductionOnElseApply = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-else-apply',
    reviewers: null, // gate is the aws actor_id allowlist, not a github reviewer
    waitTimer: null,
    deploymentBranchPolicy: null, // any branch
    preventSelfReview: false,
  });

  // declare environment for production plan from any branch (readonly, no approval)
  const envProductionOnElsePlan = DeclaredGithubEnvironment.as({
    repo,
    name: 'production-on-else-plan',
    reviewers: null, // no approval required — plan is readonly, safe
    waitTimer: null, // no delay
    deploymentBranchPolicy: null, // any branch
    preventSelfReview: false,
  });

  // restrict who may cut `v*` release tags to the rhelease app only
  // .why = prod apply is gated on a release tag cut from main; if anyone could push a
  //        `v*` tag, that gate is bypassable. this ruleset blocks create/move/delete of
  //        `v*` tags for everyone except the rhelease app (the github half of the oidc guarantee)
  const rulesetReleaseTags = DeclaredGithubRepoRuleset.as({
    repo,
    name: 'protect-release-tags',
    target: 'tag',
    enforcement: 'active',

    // only the rhelease github app may create `v*` tags
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
    teamReleasersRepoAccess,
    envProductionOnMain,
    envProductionOnElseApply,
    envProductionOnElsePlan,
    rulesetReleaseTags,
  ];
};
