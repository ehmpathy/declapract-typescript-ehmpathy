variable "name" {
  type = string
}
variable "visibility" {
  default = "private"
}
variable "protected" {
  default = true
}

# the repository itself
resource "github_repository" "this" {
  name       = var.name
  visibility = var.visibility

  # standard settings
  has_issues             = true # only issues are allowed... todo: decide if there's too much overlap between linear and issues
  has_projects           = false
  has_wiki               = false
  has_downloads          = false
  is_template            = false
  allow_squash_merge     = true  # only squash merges are allowed
  allow_merge_commit     = false # especially not merge merges. never merge merges
  allow_rebase_merge     = false
  delete_branch_on_merge = true # always delete branch on merging

  lifecycle {
    ignore_changes = [
      description # dont worry about the description in these checks; the purpose of these checks is to check developer experience, not repo contents
    ]
  }
}

# the main branch (its "data" instead of a "resource" because 1. you cant create it w/ terraform anyway, 2. there's a constant "etag" out of sync with terraform)
data "github_branch" "main" {
  repository = github_repository.this.name
  branch     = "main"
}

# set it as the default for this org
resource "github_branch_default" "default_branch_is_main" {
  repository = github_repository.this.name
  branch     = data.github_branch.main.branch
}

# the branch protection rule on the main branch
resource "github_branch_protection" "main_branch" {
  repository_id = github_repository.this.node_id
  pattern       = data.github_branch.main.branch

  enforce_admins      = true  # yes, even admins need to follow this (note: they can still take the time to go and change the settings temporarily for the exceptions)
  allows_deletions    = false # dont allow the `main` branch to be deleted
  allows_force_pushes = false # dont allow `main` branch to be force pushed to

  required_status_checks {
    strict = true # branch must be up to date. otherwise, we dont know if it will really pass once it is merged
    contexts = [
      "test-commits",
      "test-types",
      "test-format",
      "test-lint",
      "test-unit",
      "test-integration",
      "test-acceptance-locally"
    ]
  }

  count = var.protected == false ? 0 : 1 # only define protection rules if this repository is marked as protected (default = true)
}
