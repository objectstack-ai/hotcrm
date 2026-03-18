'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ChevronDown, Globe, Menu, X } from 'lucide-react';
import type { Dictionary, Locale } from '@/lib/i18n';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  const productLinks = [
    { href: `/${locale}/products/sales`, label: dict.nav.salesCloud },
    { href: `/${locale}/products/service`, label: dict.nav.serviceCloud },
    { href: `/${locale}/products/marketing`, label: dict.nav.marketingCloud },
    { href: `/${locale}/products/revenue`, label: dict.nav.revenueCloud },
    { href: `/${locale}/products/hr`, label: dict.nav.hrCloud },
    { href: `/${locale}/products/platform`, label: dict.nav.platformAI },
  ];

  const otherLocale: Locale = locale === 'en' ? 'zh' : 'en';

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={`/${locale}`} className="flex items-center gap-2" aria-label="HotCRM - Home">
          <Image src="/logo.svg" alt="HotCRM Logo" width={120} height={32} priority />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={productsOpen}
              aria-haspopup="true"
              onClick={() => setProductsOpen(o => !o)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setProductsOpen(false);
              }}
            >
              {dict.nav.products}
              <ChevronDown className="w-4 h-4" />
            </button>
            {productsOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg p-2"
                role="menu"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setProductsOpen(false);
                }}
              >
                {productLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {dict.nav.docs}
          </Link>

          <Link
            href="https://github.com/objectstack-ai/hotcrm"
            target="_blank"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {dict.nav.github}
          </Link>

          <Link
            href={`/${otherLocale}`}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Switch to ${localeLabels[otherLocale]}`}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            {localeLabels[otherLocale]}
          </Link>

          <Link
            href="/docs/getting-started/introduction"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {dict.nav.getStarted}
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4">
          <div className="py-2 font-medium text-sm text-muted-foreground">{dict.nav.products}</div>
          {productLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 pl-4 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/docs" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
            {dict.nav.docs}
          </Link>
          <Link
            href={`/${otherLocale}`}
            className="flex items-center gap-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label={`Switch to ${localeLabels[otherLocale]}`}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            {localeLabels[otherLocale]}
          </Link>
        </div>
      )}
    </header>
  );
}
