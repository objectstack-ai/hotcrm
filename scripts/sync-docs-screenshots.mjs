import { realpathSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(repositoryRoot, 'assets', 'screenshots', 'hotcrm');
const destinationRoot = join(repositoryRoot, 'apps', 'docs', 'public', 'screenshots', 'hotcrm');

// Exported so `test/docs-home-screens.test.ts` can hold the homepage's screens to
// this list (#2694); the copy below runs only when this file is executed.
export const screenshots = [
  { id: 'customer-360' },
  { id: 'lead-detail' },
  { id: 'sales-pipeline' },
  { id: 'quote-pipeline' },
  { id: 'campaign-detail' },
  { id: 'sales-dashboard', extension: 'jpg' },
  { id: 'executive-dashboard' },
  { id: 'large-deal-approval' },
  { id: 'sales-order' },
  { id: 'case-detail' },
  { id: 'invoice-payments' },
  { id: 'project-plan' },
  { id: 'expense-report' },
];
export const locales = ['en', 'zh-Hans'];

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  for (const { id, extension = 'png' } of screenshots) {
    for (const locale of locales) {
      const source = join(sourceRoot, id, `${locale}.${extension}`);
      const destination = join(destinationRoot, id, `${locale}.${extension}`);

      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
  }

  console.log(`Synced ${screenshots.length * locales.length} HotCRM documentation screenshots.`);
}
