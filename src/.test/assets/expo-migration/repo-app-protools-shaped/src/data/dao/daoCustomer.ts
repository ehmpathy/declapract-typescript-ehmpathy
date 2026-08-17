// a deprecated data-layer dao. the directory-structure-src migration must move this file
// data/dao/ -> access/daos/ (the dao-specific rename, not the generic data/ -> access/).
export interface Customer {
  id: string;
  name: string;
}
export const daoCustomer = {
  findById: async (id: string): Promise<Customer> => ({ id, name: 'test' }),
};
