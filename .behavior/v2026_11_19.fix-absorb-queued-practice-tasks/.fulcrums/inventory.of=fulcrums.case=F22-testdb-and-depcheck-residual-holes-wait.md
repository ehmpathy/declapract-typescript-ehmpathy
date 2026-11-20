# F22 — the testdb-clear and depcheck residual holes wait for their own rework

## .the fork
- a: close each now: a stopped old-project container, a second clone with the same project name, a non-docker port holder, and depcheck's by-name `.agent/` list
- b: fix the defects each issue reported; leave these four edges named in a dream

## .taken
b. each edge needs a change outside its issue's ask:
- a stopped container from an older project name, and a second clone of one repo, both need the testdb identity to change (a clone-unique project name), which moves every adopter's container name
- a non-docker port holder is invisible to `docker ps`; `up` already names the port in its own bind error
- depcheck's list (`.agent/.actors`, `.agent/.cache`, `.agent/repo=*`) covers every `.agent/` dir that exists; a single `.agent/*` rule rewrites a merged template with its own fix logic, for a dir that does not exist yet

none fails open on a path an adopter walks today, and none narrows a practice.

## .rework
dirty for the identity change (container names move); clean for depcheck.

## .confidence — 78%, why not higher
the stopped-container case is a real one-time trip on the first `clear` after the upgrade; its hint exists but prints only for a live holder.

## .where
`persist-with-rds/best-practice/provision/docker/testdb/compose.sh`, `lint/best-practice/.depcheckrc.yml`; dream `v2026_11_19.reseed.testdb-clear-and-depcheck-edges`

## .verdict
— (awaits review)
