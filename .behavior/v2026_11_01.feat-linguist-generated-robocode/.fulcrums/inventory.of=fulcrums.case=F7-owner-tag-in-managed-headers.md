# F7: a declarer tag in each managed header, not a registry of sections

## .the fork

every declarer of `.gitattributes` must emit one identical layout, or `declapract apply` rewrites the file on every run. a sorted union (the `.gitignore` method) cannot serve, since line order carries load here. so each declarer must recognize the sections of the other declarers.

- **A. registry** — one list of every practice's sections in `src/utils`. each declarer reads it.
- **B. declarer tag** — each managed header opens with its declarer, `# [tests-any] collapse test source ...`. a declarer keeps any block whose header names another declarer, verbatim, in canonical place.

## .taken: B

A moves every practice's lines into a shared util, so the content no longer lives in the practice that owns it (F1, `rule.require.entool-requests-as-practices`). B keeps each section in its declarer's declaration. the tag also tells a human reader which practice declares each block.

## .the order list is not A

the util holds `declarersOrderedForGitattributes`: five names, in the vision's order. it holds no section content, so each practice still owns its lines (the reason A lost). the list exists because the order of sections carries load: rhachet must sit last, or a later `*.test.ts` collapse folds a yield or radio file named like a test. a code-unit sort of the tags put tests-any after rhachet; `git check-attr` showed both such paths `set`.

## .term

the tag names the **declarer** (`term=declarer._.choice._.md`), where `owner` is a forbidden synonym. the util's parameter, its header parser, and its error text use `declarer`. `owner` stays only where F1 means the practice that causes an artifact. the file slug keeps `owner`; a cluster rename is not owed for a filename.

## .rework: clean

the tag is header text. a switch to A moves section content into one file and drops the tag; the emit order and the convergence tests stay.

## .confidence: 75%, why low

the tag adds a token to every managed header, git's two extant headers included (their untagged forms migrate as priors). a reader might prefer plain headers and accept the registry.

## .risk: none

no credential, no prod write: header text in a generated file.

## .where

`src/utils/defineExpectedGitattributesContents.ts`; every `.gitattributes.declapract.ts`.
