// a peer util in the SAME deprecated layer (src/logic/shared/). getCustomer.ts imports
// this via a `../shared/formatCustomer` RELATIVE path, so the migration must BOTH relocate
// this file (logic/shared/ -> domain.operations/shared/) AND rewrite the relative import in
// its importer to the @src alias — a two-pass settle the relative-imports deferred-dir guard
// governs. it exists so the pipeline exercises relative-imports end-to-end.
import type { Customer } from '@src/data/dao/daoCustomer';

export const formatCustomer = (customer: Customer): Customer => customer;
