# S1: daos and schemas stay open

## .said

> i want the daos visible still. just not the .generated/ within the daos. same with the schemas. those are important cause they are the internal contracts.

— the commander, pr #761 review, on `1.vision.yield.md` line 37

## .settled

- the daos and the schemas are the internal contracts; a reviewer reads them open
- only the `.generated/` dirs within the daos and within the schemas fold
- overrules F3 (B → `.generated/` dirs only)

## .landed

- `persist-with-rds`: `src/access/daos/**/.generated/**`, `provision/schema/**/.generated/**`
- `persist-with-dynamodb`: `src/access/daos/**/.generated/**`
- the prior whole-dao and schema-sql lines are retired entries
