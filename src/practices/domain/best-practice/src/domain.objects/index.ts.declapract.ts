import { FileCheckType } from 'declapract';

// a project should declare domain objects — otherwise, what does the service operate on?
//
// this requires the `src/domain.objects/` layout that `directory-structure-src`'s `domain-dir`
// bad-practice enforces. it deliberately does NOT require the deprecated `src/domain/objects/`
// path: `domain-dir` forbids every file under `src/**/domain/**` and its fix relocates them to
// `src/domain.objects/`, so a check that required `src/domain/objects/index.ts` (D51) contradicted
// its own kin — `domain-dir`'s fix moved the required file away, so a repo reached a terminal,
// unrepairable state. keyed on the go-forward layout, the two practices agree: `domain-dir`'s fix
// produces exactly this path.
export const check = FileCheckType.EXISTS;
