// a deprecated-layer operation that imports from the deprecated data-layer dao
// via the @src alias (the go-forward import style the relative-imports practice
// pushes repos toward). the directory-structure-src migration must move this file
// logic/ -> domain.operations/ AND rewrite the import path data/dao -> access/daos.
//
// this file deliberately carries THREE distinct import SHAPES that all reference the
// deprecated data/ layer, so the pipeline rewrite is proven to handle more than one
// import per file (the r10 blocker-3 case): a plain value import, a type-only import,
// and a barrel re-export. every one must land at access/daos, none may keep data/dao.
import { daoCustomer } from '@src/data/dao/daoCustomer';
import type { Customer } from '@src/data/dao/daoCustomer';
export { daoCustomer as daoCustomerReExport } from '@src/data/dao/daoCustomer';

// a `../` RELATIVE import to a peer in the same deprecated layer. relative-imports must
// rewrite it to the @src alias — but only AFTER the dir-move relocates this file out of
// logic/. on pass 1 this file still sits under the deprecated logic/ dir, so relative-imports
// DEFERS (its isDeferredToDeprecatedDirMove guard) while old-logic-dir relocates the file; on
// pass 2 the file sits at domain.operations/ and relative-imports fires and converts
// ../shared/formatCustomer -> @src/domain.operations/shared/formatCustomer. proves the
// branch-new deferred-dir guard end-to-end (the r1 relative-imports blocker).
import { formatCustomer } from '../shared/formatCustomer';

export const getCustomer = async (input: { id: string }): Promise<Customer> => {
  return formatCustomer(await daoCustomer.findById(input.id));
};
