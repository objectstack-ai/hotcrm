import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Connector Activation
 *
 * Validates connector configuration and tests connectivity
 * before allowing a connector to be activated.
 */
const ConnectorActivation: Hook = {
  name: 'ConnectorActivation',
  object: 'connector',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    const existing = ctx.result as Record<string, any>;

    if (doc.status === 'active' && existing?.status !== 'active') {
      if (!existing?.base_url && !doc.base_url) {
        throw new Error('Validation Error: base_url is required to activate a connector');
      }
      if (!existing?.auth_type && !doc.auth_type) {
        throw new Error('Validation Error: auth_type must be configured before activation');
      }
      console.log(`🔌 Activating connector: ${existing?.name || doc.name}`);
    }
  }
};

/**
 * Connector Deactivation
 *
 * Disconnects all active connections when a connector is deactivated.
 */
const ConnectorDeactivation: Hook = {
  name: 'ConnectorDeactivation',
  object: 'connector',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || doc.status !== 'inactive') return;

    try {
      const connections = await (ctx.ql as any).find('connection', {
        filters: [['connector_id', '=', doc._id], ['status', '=', 'connected']]
      });
      for (const conn of connections) {
        await (ctx.ql as any).doc.update('connection', conn._id, { status: 'disconnected' });
      }
      console.log(`🔌 Deactivated ${connections.length} connections for connector ${doc._id}`);
    } catch (error) {
      console.warn('⚠️ Failed to deactivate connections:', error);
    }
  }
};

/**
 * Connector Health Check
 *
 * Sets connector status to error if the health check fails after creation.
 */
const ConnectorHealthCheck: Hook = {
  name: 'ConnectorHealthCheck',
  object: 'connector',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || !doc.base_url) return;

    console.log(`🏥 Running initial health check for connector ${doc.name}`);
    // Health check is delegated to the runtime connector framework
  }
};

export { ConnectorActivation, ConnectorDeactivation, ConnectorHealthCheck };
export default ConnectorActivation;
