# terraform... why cant you just look this stuff up given that you already have the inputs....
REPO_NAME='@declapract{variable.serviceName}';

# import the repo itself
terraform import module.product.github_repository.this $REPO_NAME;

# import the default branch setting
terraform import module.product.github_branch_default.default_branch_is_main $REPO_NAME;

# import the branch protection rules
terraform import "module.product.github_branch_protection.main_branch[0]" $REPO_NAME:main

