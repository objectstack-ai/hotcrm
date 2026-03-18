import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';

const currentYear = new Date().getFullYear();

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-sm font-semibold mb-4">{dict.footer.products}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href={`/${locale}/products/sales`} className="hover:text-foreground transition-colors">{dict.nav.salesCloud}</Link></li>
              <li><Link href={`/${locale}/products/service`} className="hover:text-foreground transition-colors">{dict.nav.serviceCloud}</Link></li>
              <li><Link href={`/${locale}/products/marketing`} className="hover:text-foreground transition-colors">{dict.nav.marketingCloud}</Link></li>
              <li><Link href={`/${locale}/products/revenue`} className="hover:text-foreground transition-colors">{dict.nav.revenueCloud}</Link></li>
              <li><Link href={`/${locale}/products/hr`} className="hover:text-foreground transition-colors">{dict.nav.hrCloud}</Link></li>
              <li><Link href={`/${locale}/products/platform`} className="hover:text-foreground transition-colors">{dict.nav.platformAI}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">{dict.footer.resources}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground transition-colors">{dict.footer.documentation}</Link></li>
              <li><Link href="/docs/developers" className="hover:text-foreground transition-colors">{dict.footer.apiReference}</Link></li>
              <li><Link href="/docs/getting-started" className="hover:text-foreground transition-colors">{dict.footer.guides}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">{dict.footer.company}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="https://github.com/objectstack-ai/hotcrm" target="_blank" className="hover:text-foreground transition-colors">{dict.footer.openSource}</Link></li>
              <li><Link href="https://github.com/objectstack-ai/hotcrm" target="_blank" className="hover:text-foreground transition-colors">{dict.nav.github}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{dict.footer.builtWith}</p>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border/40 text-center text-sm text-muted-foreground">
          {dict.footer.copyright.replace('{year}', String(currentYear))}
        </div>
      </div>
    </footer>
  );
}