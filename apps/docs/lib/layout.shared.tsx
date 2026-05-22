import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const siteConfig = {
  name: 'HotCRM',
  github: 'https://github.com/objectstack-ai/hotcrm',
};

function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HotCRM"
      className="shrink-0"
    >
      <rect x="2" y="2" width="28" height="28" rx="9" fill="#F97316" />
      <rect x="2.5" y="2.5" width="27" height="27" rx="8.5" stroke="#FFF7ED" strokeOpacity=".42" />
      <path
        d="M9.2 17.1c2.5-5.7 9.1-7.5 13.5-3.4 2.6 2.4 2.1 6.7-1 8.2-2.6 1.3-5.2-.2-7.1-2.9-1.5-2.2-3.1-3.1-5.4-1.9Z"
        fill="#FFF7ED"
        fillOpacity=".96"
      />
      <path
        d="M22.8 14.9c-2.5 5.7-9.1 7.5-13.5 3.4-2.6-2.4-2.1-6.7 1-8.2 2.6-1.3 5.2.2 7.1 2.9 1.5 2.2 3.1 3.1 5.4 1.9Z"
        fill="#FFF7ED"
        fillOpacity=".42"
      />
      <circle cx="16" cy="16" r="2.5" fill="#9A3412" fillOpacity=".9" />
    </svg>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
    },
    githubUrl: siteConfig.github,
  };
}
