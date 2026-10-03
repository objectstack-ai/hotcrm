import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI, type Translations } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

// fumadocs-ui keys each UI string by its English text plus the component it
// sits in (`'Search(search dialog)'`), and silently ignores a key it does not
// know — so a misspelt key ships an English label on a Chinese page with every
// check green. `satisfies Partial<Translations>` turns that into a type error.
const { provider } = defineI18nUI(i18n, {
  en: { displayName: 'English' },
  'zh-Hans': {
    displayName: '简体中文',
    'Search(search trigger)': '搜索文档',
    'Search(search dialog)': '搜索文档',
    'No results found(search dialog)': '没有找到结果',
    'On this page(table of contents)': '本页目录',
    'No Headings(table of contents)': '本页无标题',
    'Last updated on(page footer)': '最后更新于',
    'Choose a language(language switcher)': '选择语言',
    'Choose a language(language switcher)(aria-label)': '选择语言',
    'Next Page(pagination)': '下一页',
    'Previous Page(pagination)': '上一页',
    'Edit on GitHub(edit page)': '在 GitHub 上编辑',
    'Copy Markdown(page actions)': '复制 Markdown',
    'Open(page actions)': '打开',
  } satisfies Partial<Translations>,
  'zh-Hant': {
    displayName: '繁體中文',
    'Search(search trigger)': '搜尋文檔',
    'Search(search dialog)': '搜尋文檔',
    'No results found(search dialog)': '沒有找到結果',
    'On this page(table of contents)': '本頁目錄',
    'No Headings(table of contents)': '本頁無標題',
    'Last updated on(page footer)': '最後更新於',
    'Choose a language(language switcher)': '選擇語言',
    'Choose a language(language switcher)(aria-label)': '選擇語言',
    'Next Page(pagination)': '下一頁',
    'Previous Page(pagination)': '上一頁',
    'Edit on GitHub(edit page)': '在 GitHub 上編輯',
    'Copy Markdown(page actions)': '複製 Markdown',
    'Open(page actions)': '開啟',
  } satisfies Partial<Translations>,
});

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang } = await params;

  return (
    <html lang={lang} suppressHydrationWarning className="font-sans">
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={provider(lang)}>{children}</RootProvider>
      </body>
    </html>
  );
}
