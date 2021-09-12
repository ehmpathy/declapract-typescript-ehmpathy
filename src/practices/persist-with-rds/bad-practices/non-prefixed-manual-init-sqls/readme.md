we have several files that are not automatically managed by `sql-schema-control` and must be applied manually with superuser privileges

to make the distinction between these and the files that _are_ managed by `sql-schema-control`, we've adopted the convention that the ones that need to be applied manually with `superuser` privs are prefixed with a `.`

this practice checks for the case where we didn't have the prefix - and fixes it by prefixing the files for us
