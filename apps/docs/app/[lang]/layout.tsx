import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: { displayName: 'English' },
    'zh-Hans': {
      displayName: '简体中文',
      search: '搜索文档',
      searchNoResult: '没有找到结果',
      toc: '本页目录',
      tocNoHeadings: '本页无标题',
      lastUpdate: '最后更新于',
      chooseLanguage: '选择语言',
      nextPage: '下一页',
      previousPage: '上一页',
      chooseTheme: '选择主题',
      editOnGithub: '在 GitHub 上编辑',
      pageActionsCopyMarkdown: '复制 Markdown',
      pageActionsOpen: '打开',
    },
    'zh-Hant': {
      displayName: '繁體中文',
      search: '搜尋文檔',
      searchNoResult: '沒有找到結果',
      toc: '本頁目錄',
      tocNoHeadings: '本頁無標題',
      lastUpdate: '最後更新於',
      chooseLanguage: '選擇語言',
      nextPage: '下一頁',
      previousPage: '上一頁',
      chooseTheme: '選擇佈景主題',
      editOnGithub: '在 GitHub 上編輯',
      pageActionsCopyMarkdown: '複製 Markdown',
      pageActionsOpen: '開啟',
    },
  },
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
