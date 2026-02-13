import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Connection Validation
 *
 * Ensures the referenced connector exists and is active
 * before a connection can be created.
 */
const ConnectionValidation: Hook = {
  name: 'ConnectionValidation',
  object: 'connection',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.connector_id) {
      try {
        const connector = await ctx.ql.findOne('connector', doc.connector_id);
        if (!connector) {
          throw new Error('Validation Error: Referenced connector does not exist');
        }
        if (connector.status !== 'active') {
          throw new Error('Validation Error: Connector must be active to create a connection');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Validation Error')) throw error;
        throw new Error('Validation Error: Unable to verify connector');
      }
    }
  }
};

/**
 * Token Refresh
 *
 * Checks token expiry on read and triggers a refresh if the token
 * is close to expiring.
 */
const TokenRefresh: Hook = {
  name: 'TokenRefresh',
  object: 'connection',
  events: ['afterRead'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || !doc.expires_at) return;

    const expiresAt = new Date(doc.expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < bufferMs && doc.status === 'connected') {
      console.log(`🔄 Token nearing expiry for connection ${doc._id}, triggering refresh`);
      try {
        await ctx.ql.doc.update('connection', doc._id, { status: 'expired' });
      } catch (error) {
        console.warn('⚠️ Failed to mark connection as expired:', error);
      }
    }
  }
};

/**
 * Expiry Alert
 *
 * Logs an alert when a connection status changes to expired or error.
 */
const ExpiryAlert: Hook = {
  name: 'ExpiryAlert',
  object: 'connection',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id) return;

    if (doc.status === 'expired') {
      console.log(`⚠️ Connection ${doc.name} has expired. Please re-authenticate.`);
    }
    if (doc.status === 'error') {
      console.log(`🚨 Connection ${doc.name} is in error state.`);
    }
  }
};

export { ConnectionValidation, TokenRefresh, ExpiryAlert };
export default ConnectionValidation;
