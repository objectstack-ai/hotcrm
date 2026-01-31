# Plugin Architecture Guide

## Overview

HotCRM uses a **plugin-based architecture** where each business package (CRM, Products, Finance, Support) is an independent plugin. This architecture provides:

- **Modularity**: Each plugin is self-contained with its own objects and logic
- **Dependency Management**: Plugins can declare dependencies on other plugins
- **Independent Development**: Plugins can be developed and deployed independently
- **Flexible Deployment**: Choose which plugins to load based on business needs

## Plugin Structure

Each plugin is defined in a `plugin.ts` file with the following structure:

```typescript
export const MyPlugin = {
  name: 'my_plugin',              // Machine name (snake_case)
  label: 'My Plugin',              // Human-readable name
  version: '1.0.0',                // Semantic version
  description: 'Plugin description',
  
  // Plugin dependencies (list of plugin names)
  dependencies: ['crm'],
  
  // Business objects provided by this plugin
  objects: {
    my_object: MyObject,
    another_object: AnotherObject,
  },
  
  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'My Group',
      children: [
        { type: 'object', object: 'my_object' },
      ]
    }
  ]
};

export default MyPlugin;
```

## Available Plugins

### 1. CRM Plugin (@hotcrm/crm)

**Core CRM functionality** - Accounts, Contacts, Leads, Opportunities, and Marketing Automation

**Dependencies**: None (core plugin)

**Objects**:
- Account, Contact, Lead, Opportunity
- Activity, Task, Note
- Campaign Member
- Email Template, Landing Page, Form, Marketing List, Unsubscribe

**Location**: `packages/crm/src/plugin.ts`

### 2. Products Plugin (@hotcrm/products)

**Product catalog, pricing rules, and CPQ** (Configure, Price, Quote)

**Dependencies**: `crm` (required for Account and Opportunity references)

**Objects**:
- Quote, Quote Line Item
- Product Bundle, Price Rule
- Approval Request, Discount Schedule

**Location**: `packages/products/src/plugin.ts`

### 3. Finance Plugin (@hotcrm/finance)

**Financial management** - Contracts, Payments, and Revenue Recognition

**Dependencies**: `crm` (required for Account and Opportunity references)

**Objects**:
- Contract

**Location**: `packages/finance/src/plugin.ts`

### 4. Support Plugin (@hotcrm/support)

**Customer support management** - Cases, Knowledge Base, SLA, Queues

**Dependencies**: `crm` (required for Account and Contact references)

**Objects**:
- Case, Case Comment, Knowledge Article
- SLA Policy, SLA Template, SLA Milestone
- Business Hours, Holiday Calendar, Holiday
- Queue, Queue Member, Routing Rule, Escalation Rule
- Skill, Agent Skill
- Email-to-Case, Web-to-Case, Social Media Case
- Portal User, Forum Topic, Forum Post

**Location**: `packages/support/src/plugin.ts`

## Plugin Loading

Plugins are loaded through the `objectstack.config.ts` file:

```typescript
import { CRMPlugin } from '@hotcrm/crm/dist/plugin.js';
import { ProductsPlugin } from '@hotcrm/products/dist/plugin.js';
import { FinancePlugin } from '@hotcrm/finance/dist/plugin.js';
import { SupportPlugin } from '@hotcrm/support/dist/plugin.js';

export default {
  plugins: [
    CRMPlugin,
    ProductsPlugin,
    FinancePlugin,
    SupportPlugin,
  ]
};
```

### Dependency Resolution

The server automatically sorts plugins by their dependencies using topological sort:

1. CRM plugin loads first (no dependencies)
2. Products, Finance, and Support plugins load after CRM

If there are circular dependencies, the server will throw an error.

## Starting the Server

Use the `@objectstack/cli` command to start the server with all plugins:

```bash
# Development mode
npm run dev

# Production mode
npm run start
```

The server will:
1. Load the `objectstack.config.ts` configuration
2. Sort plugins by dependencies
3. Register each plugin with the ObjectStack kernel
4. Start the HTTP server
5. Display plugin loading information

Example output:
```
🚀 HotCRM Server
------------------------
📂 Config: objectstack.config.ts
🌐 Port: 3000

📦 Loading 4 business plugin(s)...

  📦 CRM
     13 object(s)
     ✓ Loaded successfully

  📦 Products & Pricing
     6 object(s) (depends on: crm)
     ✓ Loaded successfully

  📦 Finance
     1 object(s) (depends on: crm)
     ✓ Loaded successfully

  📦 Customer Support
     21 object(s) (depends on: crm)
     ✓ Loaded successfully

✓ All business plugins loaded (41 total objects)

✅ HotCRM server is running!
   ObjectStack v0.7.2 (Plugin Architecture)
   4 business plugins loaded
   41 objects available
```

## Creating a New Plugin

To create a new plugin:

1. **Create the package directory**:
   ```bash
   mkdir -p packages/my-plugin/src
   ```

2. **Create the plugin definition** (`packages/my-plugin/src/plugin.ts`):
   ```typescript
   import MyObject from './my_object.object';
   
   export const MyPlugin = {
     name: 'my_plugin',
     label: 'My Plugin',
     version: '1.0.0',
     description: 'My custom plugin',
     dependencies: ['crm'],  // List plugin dependencies
     objects: {
       my_object: MyObject,
     },
     navigation: [
       {
         type: 'group',
         label: 'My Objects',
         children: [
           { type: 'object', object: 'my_object' },
         ]
       }
     ]
   };
   
   export default MyPlugin;
   ```

3. **Export the plugin** in `packages/my-plugin/src/index.ts`:
   ```typescript
   export { default as MyPlugin } from './plugin';
   ```

4. **Add to configuration** in `packages/server/objectstack.config.ts`:
   ```typescript
   import { MyPlugin } from '@hotcrm/my-plugin/dist/plugin.js';
   
   export default {
     plugins: [
       CRMPlugin,
       MyPlugin,  // Add your plugin here
       // ...
     ]
   };
   ```

5. **Update package.json** to include dependencies:
   ```json
   {
     "dependencies": {
       "@hotcrm/crm": "workspace:*"
     }
   }
   ```

## Plugin Dependencies

Plugins can declare dependencies on other plugins:

```typescript
export const MyPlugin = {
  dependencies: ['crm', 'products'],  // This plugin requires CRM and Products
  // ...
};
```

Dependencies ensure:
- The required plugin is loaded first
- Object references work correctly
- Business logic has access to required objects

## Best Practices

1. **Keep plugins focused**: Each plugin should represent a cohesive business domain
2. **Declare all dependencies**: Explicitly list plugins your plugin depends on
3. **Avoid circular dependencies**: Design plugins to have a clear hierarchy
4. **Use semantic versioning**: Follow semver for plugin versions
5. **Document your plugin**: Include clear descriptions and usage examples
6. **Test independently**: Each plugin should be testable in isolation

## Migration from Direct Object Loading

The plugin architecture is backward compatible. The configuration still provides all objects in the `objects` field for systems that expect direct object access:

```typescript
export default {
  plugins: [...],      // New plugin-based architecture
  objects: {...},      // Backward compatibility: all objects from all plugins
};
```

## Troubleshooting

### Plugin not loading

Check that:
1. The plugin is imported in `objectstack.config.ts`
2. The plugin is in the `plugins` array
3. All dependencies are listed and available
4. The plugin exports a default export

### Circular dependency error

Redesign your plugins to remove circular dependencies. For example:
- Move shared objects to a common plugin
- Use dependency injection instead of direct references

### Objects not found

Ensure:
1. All plugins are built (`npm run build`)
2. Plugin dependencies are loaded first
3. Object names match between plugins

## Future Enhancements

Planned improvements to the plugin architecture:

- **Plugin marketplace**: Share and install community plugins
- **Hot reloading**: Update plugins without restarting the server
- **Plugin sandboxing**: Isolate plugins for security
- **Plugin configuration**: Per-plugin settings and customization
- **Plugin versioning**: Support multiple versions of the same plugin
