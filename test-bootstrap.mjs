import { ObjectKernel, DriverPlugin, AppPlugin } from '@objectstack/runtime';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { CRMPlugin } from './packages/crm/dist/plugin.js';

async function test() {
  console.log('[Test] Starting bootstrap test...');
  const kernel = new ObjectKernel();

  console.log('[Test] Registering ObjectQLPlugin...');
  await kernel.use(new ObjectQLPlugin());

  console.log('[Test] Registering DriverPlugin...');
  await kernel.use(new DriverPlugin(new InMemoryDriver(), 'memory'));

  console.log('[Test] Registering root AppPlugin...');
  await kernel.use(new AppPlugin({
    manifest: {
      id: 'com.hotcrm.app',
      namespace: 'hotcrm',
      version: '1.0.0',
      type: 'app',
      name: 'HotCRM Test',
    },
    objects: [],
    plugins: [],
  }));

  console.log('[Test] Registering CRM plugin...');
  await kernel.use(new AppPlugin(CRMPlugin));

  console.log('[Test] Starting bootstrap...');
  console.log('[Test] Number of plugins registered:', kernel.plugins?.size);
  await kernel.bootstrap();

  console.log('[Test] Bootstrap complete!');
  
  // Check services
  const metadata = kernel.getService('metadata');
  const data = kernel.getService('data');
  console.log('[Test] Metadata service:', metadata ? 'FOUND' : 'MISSING');
  console.log('[Test] Data service:', data ? 'FOUND' : 'MISSING');
  
  process.exit(0);
}

test().catch(err => {
  console.error('[Test] Error:', err);
  process.exit(1);
});
