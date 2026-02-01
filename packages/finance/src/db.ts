// Temporary shim for removed @hotcrm/core db
// TODO: Refactor to use @objectstack/runtime broker
export const db: any = {
  doc: {
    get: async () => ({}) as any,
    create: async () => ({}) as any,
    update: async () => ({}) as any,
    delete: async () => ({}) as any,
    find: async () => [] as any[]
  },
  find: async () => [] as any[]
};
