# F3: "dao-generator output" = the dao + sql footprint, not only `.generated/`

## .the fork

- **A. narrow** — collapse only `src/access/daos/.generated/**` (types + query functions; never hand-edited).
- **B. dao + sql footprint** — collapse `src/access/daos/**` (rds + dynamodb) and `provision/schema/sql/{tables,views,functions}/**` (rds).
- **C. every generator dir** — B plus `provision/aws/product/**` (dynamodb terraform).

## .taken: B

the generator emits the whole dao tree per entity; a regen pr touches all of it. A leaves most of the regen wall open.

C is refused: `provision/aws/product/` is the repo's general product-infra dir, so hand-written terraform lives beside the generated output. a collapsed infra change is a safety hazard, not a convenience.

## .rework: clean

edit the path list in two practice sections.

## .confidence: 65%, why low

sql-dao-generator's readme invites hand edits to the emitted daos. case=4's repo override is the escape hatch. asked as Q2.

## .risk: none

no credential, no prod write: path lines in a template. it keeps the infra dir open, so no terraform change is ever folded out of a reviewer's view.

## .where

`1.vision.yield.md` § the contract, persist sections.
