import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: '../../content/docs',
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// Blog posts live in `content/blog`. Each post adds an author + date on top of
// the standard frontmatter (title/description). The folder holds no post today
// (hotcrm#2603), only `.gitkeep`; while it is empty `lib/layout.shared.tsx`
// shows no Blog link, and the routes under `app/[lang]/blog/` stay.
export const blog = defineCollections({
  type: 'doc',
  dir: '../../content/blog',
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()).optional(),
  }),
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
