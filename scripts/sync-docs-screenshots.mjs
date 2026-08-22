import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(repositoryRoot, 'assets', 'screenshots', 'hotcrm');
const destinationRoot = join(repositoryRoot, 'apps', 'docs', 'public', 'screenshots', 'hotcrm');

const screenshots = [
  { id: 'customer-360' },
  { id: 'lead-detail' },
  { id: 'sales-pipeline' },
  { id: 'quote-pipeline' },
  { id: 'campaign-detail' },
  { id: 'sales-dashboard', extension: 'jpg' },
  { id: 'large-deal-approval' },
  { id: 'sales-representative-permissions' },
];
const locales = ['en', 'zh-Hans'];

for (const { id, extension = 'png' } of screenshots) {
  for (const locale of locales) {
    const source = join(sourceRoot, id, `${locale}.${extension}`);
    const destination = join(destinationRoot, id, `${locale}.${extension}`);

    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

console.log(`Synced ${screenshots.length * locales.length} HotCRM documentation screenshots.`);
