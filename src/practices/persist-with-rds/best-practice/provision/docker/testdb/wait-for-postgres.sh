#!/bin/sh
set -eu
# wait until postgres is really available
maxcounter=45

echo "waiting for postgres server to begin accepting connections..."
counter=1
# pass the secret via PGPASSWORD, not inline in the connection string (which leaks it to `ps`)
export PGPASSWORD="${POSTGRES_PASSWORD:-}"
# capture the probe's stderr so the real cause (bad password, port conflict, image build failure)
# surfaces on timeout, rather than one hardcoded diagnosis that reads the same for every cause
lasterr=""
while true; do
    # fold the capture into the if-condition so `set -e` does not exit on the expected
    # connect failures while postgres warms up; lasterr still holds the last stderr
    if lasterr=$(psql "dbname=${POSTGRES_DB:-} host=localhost user=postgres port=5432" -c '\l' 2>&1); then break; fi
    sleep 1
    counter=`expr $counter + 1`
    if [ $counter -gt $maxcounter ]; then
        >&2 echo "postgres did not accept connections after ${maxcounter}s; the last psql error was:"
        >&2 echo "$lasterr"
        exit 1
    fi;
done
echo "connected to postgres instance successfully"
