import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export const siteConfig = {
  name: 'HotCRM',
  github: 'https://github.com/hotcrm/hotcrm',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="HotCRM Logo" width={120} height={32} />
        </div>
      ),
    },
    links: [
      {
        text: 'GitHub',
        url: siteConfig.github,
        external: true,
      },
    ],
  };
}
