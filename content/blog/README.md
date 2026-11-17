# Blog posts

Posts for the docs site's blog live here as `<slug>.mdx`, with `<slug>.zh-Hans.mdx` and
`<slug>.zh-Hant.mdx` beside them. Each post's frontmatter carries `title`, `description`,
`author` and `date`.

While this folder holds no post, the site shows no **Blog** link
(`apps/docs/lib/layout.shared.tsx`); the routes under `apps/docs/app/[lang]/blog/` stay.
