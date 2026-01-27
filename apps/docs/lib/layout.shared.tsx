import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const siteConfig = {
  name: 'HotCRM',
  github: 'https://github.com/hotcrm/hotcrm',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: siteConfig.name,
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
