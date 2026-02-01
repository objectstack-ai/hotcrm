// Shim for @hotcrm/core db
export const db = {
  find: async (table: string, query: any) => [],
  insert: async (table: string, data: any) => ({_id: '1', ...data}),
  update: async (table: string, id: string, data: any) => ({_id: id, ...data}),
  delete: async (table: string, id: string) => true
};
