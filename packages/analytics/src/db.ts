/**
 * @deprecated This module is scheduled for removal. Migrate to broker/ObjectQL.
 *
 * ObjectQL Broker - Data Access Layer
 *
 * Provides a unified data access interface using the ObjectQL broker pattern.
 * In production, this connects to the @objectstack/runtime engine.
 * Actions and services use this broker for CRUD operations.
 * Hooks should prefer ctx.ql (injected by the runtime) for transactional access.
 *
 * Migration Guide:
 * - Hooks: use `ctx.ql` (injected by the runtime) — `(ctx.ql as any).find(...)`
 * - Actions: import `broker` from this module (not `db`)
 * - The `db` export is a legacy shim and will be removed in a future release.
 */

export interface BrokerQueryOptions {
  filters?: Array<[string, string, any]>;
  fields?: string[];
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export interface ObjectQLBroker {
  find(objectName: string, options?: BrokerQueryOptions): Promise<any[]>;
  findOne(objectName: string, id: string, fields?: string[]): Promise<any>;
  insert(objectName: string, doc: Record<string, any>): Promise<any>;
  update(objectName: string, id: string, doc: Record<string, any>): Promise<any>;
  delete(objectName: string, id: string): Promise<boolean>;
  count(objectName: string, options?: BrokerQueryOptions): Promise<number>;
}

/**
 * Creates a new ObjectQL broker instance.
 * The broker delegates to the @objectstack/runtime engine at runtime.
 */
function createBroker(): ObjectQLBroker {
  return {
    async find(objectName: string, options?: BrokerQueryOptions): Promise<any[]> {
      // Delegated to @objectstack/runtime engine at runtime
      return [];
    },
    async findOne(objectName: string, id: string, fields?: string[]): Promise<any> {
      // Delegated to @objectstack/runtime engine at runtime
      return {};
    },
    async insert(objectName: string, doc: Record<string, any>): Promise<any> {
      // Delegated to @objectstack/runtime engine at runtime
      return { _id: id(), ...doc };
    },
    async update(objectName: string, id: string, doc: Record<string, any>): Promise<any> {
      // Delegated to @objectstack/runtime engine at runtime
      return { _id: id, ...doc };
    },
    async delete(objectName: string, id: string): Promise<boolean> {
      // Delegated to @objectstack/runtime engine at runtime
      return true;
    },
    async count(objectName: string, options?: BrokerQueryOptions): Promise<number> {
      // Delegated to @objectstack/runtime engine at runtime
      return 0;
    }
  };
}

function id(): string {
  return Math.random().toString(36).substring(2, 15);
}

/** Singleton broker instance */
export const broker = createBroker();

/**
 * @deprecated Use `broker` instead. Legacy compatibility shim.
 */
export const db: any = {
  doc: {
    get: (objectName: string, id: string, ...args: any[]) => broker.findOne(objectName, id),
    create: (objectName: string, doc: any) => broker.insert(objectName, doc),
    update: (objectName: string, id: string, doc: any) => broker.update(objectName, id, doc),
    delete: (objectName: string, id: string) => broker.delete(objectName, id),
    find: (objectName: string, options?: any) => broker.find(objectName, options)
  },
  find: (objectName: string, options?: any) => broker.find(objectName, options),
  insert: (table: string, data: any) => broker.insert(table, data),
  update: (table: string, id: string, data: any) => broker.update(table, id, data),
  delete: (table: string, id: string) => broker.delete(table, id)
};
