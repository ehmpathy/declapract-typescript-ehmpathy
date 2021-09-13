#####################################################
## initilize the database in a live cluster
## - in other words, it does all of the things that docker does for us when we spin up a cluster without the db already
## - i.e.,
##    - create the database
##    - install the extensions
##    - creates the schema
##    - creates the cicd user
##    - grants the cicd user ownership of the db
## - note:
##   - requires pg admin access
##   - requires _you_ to change the passwords in prod manually
##
## usage example:
## ```sh
## ./provision/schema/deploy.database.sh dev $(op get item @declapract{variable.organizationName}db.dev.postgres | jq -r .details.password)
## ```
#####################################################

# check that user has defined the environment that they want this key created for correctly
ENVIRONMENT=$1;
if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "dev" ]; then
  echo "\nerror: Environment, the first argument, must be specified as either 'prod' or 'dev'. You specified '$ENVIRONMENT'";
  exit 1;
fi

# check that user is authed into correct account
AWS_ACCOUNT_ID=$(aws sts get-caller-identity | jq -r '.Account');
EXPECTED_AWS_ACCOUNT_ID=$([ "$ENVIRONMENT" = 'prod' ] && echo "@declapract{variable.awsAccountId.prod}" || echo "@declapract{variable.awsAccountId.dev}");
if [ "$AWS_ACCOUNT_ID" != "$EXPECTED_AWS_ACCOUNT_ID" ]; then
  echo "\nerror: the AWS_ACCOUNT that you are signed into is not correct for the environment you specified. You are authed into account '$AWS_ACCOUNT_ID' but the correct account id for '$ENVIRONMENT' IS '$EXPECTED_AWS_ACCOUNT_ID'";
  exit 1;
fi

# check that pg admin password was specified
POSTGRES_ADMIN_PASSWORD="$2"
if [ -z $POSTGRES_ADMIN_PASSWORD ]; then
  echo "\nerror: POSTGRES_ADMIN_PASSWORD must be defined as second arg";
  exit 1;
fi;

# define the postgres connecition string
CLUSTER_HOST=$([ "$ENVIRONMENT" = 'prod' ] && echo "@declapract{variable.databaseClusterHost.prod}" || echo "@declapract{variable.databaseClusterHost.dev}");
CLUSTER_CONNECTION_STRING=postgresql://postgres:$POSTGRES_ADMIN_PASSWORD@$CLUSTER_HOST:5432
ROOT_DB_CONNECTION_STRING=$CLUSTER_CONNECTION_STRING/postgres
SVC_DB_CONNECTION_STRING=$CLUSTER_CONNECTION_STRING/@declapract{variable.databaseName}

# define path to the init sqls
SRC_PATH=$(readlink --canonicalize "$0");
SRC_DIR=$(dirname $SRC_PATH);
INIT_SQLS_DIR=$SRC_DIR/sql/init;

# run the create database command on root db
echo "\n 🔨 creating the database..."
psql $ROOT_DB_CONNECTION_STRING -f $INIT_SQLS_DIR/.database.sql

echo "\n 🔨 installing the extensions..."
psql $SVC_DB_CONNECTION_STRING -f $INIT_SQLS_DIR/.extensions.sql

echo "\n 🔨 creating the schema..."
psql $SVC_DB_CONNECTION_STRING -f $INIT_SQLS_DIR/.schema.sql

echo "\n 🔨 creating the cicd user..."
psql $SVC_DB_CONNECTION_STRING -f $INIT_SQLS_DIR/.user.cicd.sql

if [ "$ENVIRONMENT" = "prod" ]; then
  echo "\n 🔨 granting reads to the datalakedb user..." # only in prod env; we dont want dev's testing data in our datalake
  psql $SVC_DB_CONNECTION_STRING -f $INIT_SQLS_DIR/.user.datalakedb.sql
fi;

echo "\n 🎉 done"
