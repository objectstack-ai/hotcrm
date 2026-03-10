/**
 * IntegrationMarquee
 * Displays well-known integration partner logos in an infinite horizontal
 * marquee (ticker) with two rows scrolling in opposite directions.
 * All brand SVGs are self-contained inline SVG paths — no external deps needed.
 */

interface IntegrationLogo {
  name: string;
  svg: React.ReactNode;
}

/* ── Brand SVG icons ──────────────────────────────────────────────────────── */

const GoogleWorkspaceSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M12 11.25v1.75H17.19C16.69 14.84 14.62 16 12 16a5 5 0 1 1 0-10c1.36 0 2.59.54 3.5 1.41L16.91 6A7 7 0 1 0 12 19c3.87 0 7-2.56 7-7 0-.47-.05-.93-.13-1.38L12 11.25Z" fill="#4285F4"/>
    <path d="M4 10.31 6.64 12.5A5 5 0 0 1 12 7c1.36 0 2.59.54 3.5 1.41L16.91 7A7 7 0 0 0 4 10.31Z" fill="#EA4335"/>
    <path d="M12 19c2.15 0 4.07-.72 5.57-1.93L15 15a5 5 0 0 1-7.64-2.5L4 14.69A7 7 0 0 0 12 19Z" fill="#34A853"/>
    <path d="M19 12c0-.47-.05-.93-.13-1.38L12 11.25V13h5.19A5 5 0 0 1 15 15l2.57 2.07A7 7 0 0 0 19 12Z" fill="#FBBC05"/>
  </svg>
);

const SlackSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M5.04 15.3a2.1 2.1 0 0 1-2.09 2.1A2.1 2.1 0 0 1 .86 15.3a2.1 2.1 0 0 1 2.09-2.09h2.09v2.09Z" fill="#E01E5A"/>
    <path d="M6.09 15.3a2.1 2.1 0 0 1 2.1-2.09 2.1 2.1 0 0 1 2.09 2.09v5.22a2.1 2.1 0 0 1-2.09 2.1 2.1 2.1 0 0 1-2.1-2.1V15.3Z" fill="#E01E5A"/>
    <path d="M8.19 5.04A2.1 2.1 0 0 1 6.1 2.95a2.1 2.1 0 0 1 2.09-2.09 2.1 2.1 0 0 1 2.1 2.09v2.09H8.19Z" fill="#36C5F0"/>
    <path d="M8.19 6.09a2.1 2.1 0 0 1 2.1 2.09 2.1 2.1 0 0 1-2.1 2.1H2.96a2.1 2.1 0 0 1-2.1-2.1 2.1 2.1 0 0 1 2.1-2.09h5.23Z" fill="#36C5F0"/>
    <path d="M18.96 8.18a2.1 2.1 0 0 1 2.09-2.09 2.1 2.1 0 0 1 2.09 2.09 2.1 2.1 0 0 1-2.09 2.1h-2.09V8.18Z" fill="#2EB67D"/>
    <path d="M17.91 8.18a2.1 2.1 0 0 1-2.09 2.1 2.1 2.1 0 0 1-2.1-2.1V2.95a2.1 2.1 0 0 1 2.1-2.09 2.1 2.1 0 0 1 2.09 2.09v5.23Z" fill="#2EB67D"/>
    <path d="M15.82 18.96a2.1 2.1 0 0 1 2.09 2.09 2.1 2.1 0 0 1-2.09 2.09 2.1 2.1 0 0 1-2.1-2.09v-2.09h2.1Z" fill="#ECB22E"/>
    <path d="M15.82 17.91a2.1 2.1 0 0 1-2.1-2.09 2.1 2.1 0 0 1 2.1-2.1h5.22a2.1 2.1 0 0 1 2.1 2.1 2.1 2.1 0 0 1-2.1 2.09h-5.22Z" fill="#ECB22E"/>
  </svg>
);

const MicrosoftTeamsSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M14.25 9.5h4.5a1.25 1.25 0 0 1 1.25 1.25v4a3 3 0 0 1-3 3h-.5a3 3 0 0 1-3-3v-4A1.25 1.25 0 0 1 14.25 9.5Z" fill="#5059C9"/>
    <circle cx="17.5" cy="6.5" r="2" fill="#5059C9"/>
    <path d="M9.5 9.5h5A1.5 1.5 0 0 1 16 11v5.5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V11A1.5 1.5 0 0 1 7.5 9.5H9.5Z" fill="#7B83EB"/>
    <circle cx="12" cy="6" r="2.5" fill="#7B83EB"/>
    <rect x="5.5" y="9.5" width="13" height="0.5" rx="0.25" fill="transparent"/>
  </svg>
);

const ZendeskSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M11.3 12.84 3 21h8.3V12.84ZM11.3 3A4.15 4.15 0 0 0 3 3h8.3Z" fill="#03363D"/>
    <path d="M12.7 11.16 21 3h-8.3v8.16ZM12.7 21a4.15 4.15 0 0 0 8.3 0H12.7Z" fill="#78A300"/>
  </svg>
);

const GithubSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"/>
  </svg>
);

const SalesforceSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M10.02 5.28a3.9 3.9 0 0 1 2.88-1.27 3.9 3.9 0 0 1 3.42 2.01 3.24 3.24 0 0 1 1.23-.24 3.3 3.3 0 0 1 3.3 3.3 3.3 3.3 0 0 1-.42 1.62 2.76 2.76 0 0 1 .66 1.8 2.79 2.79 0 0 1-2.85 2.79H7.08a3.57 3.57 0 0 1-3.57-3.57 3.57 3.57 0 0 1 2.64-3.45 3.33 3.33 0 0 1-.09-.78 3.96 3.96 0 0 1 3.96-3.96 3.9 3.9 0 0 1 0 1.75Z" fill="#00A1E0"/>
  </svg>
);

const HubspotSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M16.54 8.47V6.38a1.44 1.44 0 0 0 .84-1.3V5a1.44 1.44 0 0 0-1.44-1.44h-.06A1.44 1.44 0 0 0 14.44 5v.08a1.44 1.44 0 0 0 .84 1.3v2.09a4.09 4.09 0 0 0-1.94.85L7.6 5.12a1.64 1.64 0 1 0-.74.96l5.6 4.12a4.1 4.1 0 0 0-.62 2.16 4.1 4.1 0 0 0 4.1 4.1 4.1 4.1 0 0 0 4.1-4.1 4.1 4.1 0 0 0-3.5-4.06Zm-.6 6.08a2.03 2.03 0 1 1 0-4.06 2.03 2.03 0 0 1 0 4.06Z" fill="#FF7A59"/>
  </svg>
);

const ZoomSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <rect x="2" y="6" width="13" height="12" rx="3" fill="#2D8CFF"/>
    <path d="M15 11.5 22 7v10l-7-4.5Z" fill="#2D8CFF"/>
  </svg>
);

const StripeSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M13.5 9.1c-1.1-.4-1.7-.7-1.7-1.2 0-.4.3-.7.97-.7 1.1 0 2.3.44 3.1.83l.45-2.77A7.1 7.1 0 0 0 12.6 4.5c-1.3 0-2.38.34-3.12.97-.75.63-1.15 1.55-1.15 2.67 0 1.97 1.2 2.82 3.12 3.46 1.24.42 1.67.78 1.67 1.29 0 .53-.44.83-1.17.83-1.12 0-2.44-.49-3.44-1.11l-.46 2.84c.97.6 2.29 1.05 3.87 1.05 1.4 0 2.58-.41 3.39-1.17.81-.77 1.24-1.84 1.24-3.11-.01-2.03-1.15-2.85-2.68-3.58Z" fill="#635BFF"/>
  </svg>
);

const TwilioSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#F22F46"/>
    <circle cx="8.5" cy="8.5" r="1.8" fill="white"/>
    <circle cx="15.5" cy="8.5" r="1.8" fill="white"/>
    <circle cx="8.5" cy="15.5" r="1.8" fill="white"/>
    <circle cx="15.5" cy="15.5" r="1.8" fill="white"/>
  </svg>
);

const LinkedInSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <rect width="24" height="24" rx="4" fill="#0A66C2"/>
    <path d="M7.5 10H5v9h2.5v-9ZM6.25 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM19 14.5c0-2.76-1.34-4.5-3.5-4.5-1.06 0-1.87.5-2.5 1.25V10h-2.5v9H13v-4.5c0-1.1.63-2 1.75-2s1.75.9 1.75 2V19H19v-4.5Z" fill="white"/>
  </svg>
);

const ShopifySvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M15.34 3.06c-.02-.16-.16-.25-.28-.26-.12 0-2.34-.04-2.34-.04s-1.56-1.52-1.72-1.68a.34.34 0 0 0-.2-.06v21.48L16.54 21s.48-17.56.48-17.68a.3.3 0 0 0-.28-.3c-.14 0-1.24-.16-1.4-.19a3.37 3.37 0 0 0-.66-2.16 2.15 2.15 0 0 0-1.68-.6c0 .01.01.03 0 0Z" fill="#96BF48"/>
    <path d="M12.08 3.5c-.37.1-.77.3-1.14.6a4.88 4.88 0 0 0-.44.44 3.37 3.37 0 0 1 2.44-.22c.42.13.74.38.95.73.27.44.37.99.33 1.53a3.23 3.23 0 0 1-2.44 2.66c-.36.08-.73.1-1.08.06-.38-.05-.73-.18-1.01-.4.2 1.33.78 2.17 1.4 2.54.44.26.92.3 1.38.16a2.9 2.9 0 0 0 1.84-2.42L15 3.28c-.6-.07-2.36-.13-2.36-.13L12.08 3.5Z" fill="#5E8E3E"/>
    <path d="M9.66 6.68c0 .08.01.16.02.24.28 2.19 1.64 3.08 2.97 2.78.04-.01.08-.02.12-.04-.13-.4-.3-.84-.5-1.28-.42-.95-1.06-1.5-1.8-1.68a2.58 2.58 0 0 0-.81-.02Z" fill="#5E8E3E"/>
  </svg>
);

const OutlookSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <rect x="2" y="5" width="11" height="14" rx="1.5" fill="#0078D4"/>
    <path d="M13 9h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7V9Z" fill="#0078D4"/>
    <path d="M13 9 21 14 13 19" fill="none" stroke="#50B0F1" strokeWidth="1.5"/>
    <ellipse cx="7.5" cy="12" rx="2.5" ry="3" fill="white"/>
  </svg>
);

const NotionSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor" aria-hidden="true">
    <path d="M4.46 3.14c.77.63 1.06.58 2.5.48l13.6-.81c.29 0 .05-.29-.05-.34L18.1.72c-.48-.38-1.11-.82-2.35-.72L2.5 1.05C2.02 1.1 1.92 1.34 2.11 1.58L4.46 3.14Zm.96 3.75v14.3c0 .77.38 1.06 1.25 1.01l14.95-.86c.86-.05.96-.58.96-1.2V5.9c0-.62-.24-.96-.77-.91l-15.5.87c-.57.05-.89.39-.89.82v.01Zm14.7.53c.1.43 0 .86-.43.91l-.72.15v10.55c-.62.33-1.2.53-1.68.53-.77 0-.96-.24-1.53-.96l-4.69-7.37v7.13l1.49.34s0 .86-1.2.86l-3.3.19c-.1-.19 0-.67.33-.76l.86-.24V8.83L8.66 8.6c-.1-.43.15-1.06.77-1.1l3.55-.22 4.87 7.46V8.06l-1.25-.15c-.1-.53.29-.91.77-.96l3.56-.2v.72h-.01Z"/>
  </svg>
);

const AsanaSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="#FC636B"/>
    <circle cx="6" cy="16" r="4" fill="#FC636B"/>
    <circle cx="18" cy="16" r="4" fill="#FC636B"/>
  </svg>
);

const JiraSvg = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
    <path d="M11.98 2 2 12l10 10 10-10-10.02-10Z" fill="#2684FF"/>
    <path d="M11.98 2 6.99 7l4.99 5 4.99-5L11.98 2Z" fill="url(#jira-grad1)"/>
    <path d="M6.99 17 12 22l5.01-5L12 12 6.99 17Z" fill="url(#jira-grad2)"/>
    <defs>
      <linearGradient id="jira-grad1" x1="11.98" y1="7" x2="16.97" y2="2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2684FF"/>
        <stop offset="1" stopColor="#0052CC"/>
      </linearGradient>
      <linearGradient id="jira-grad2" x1="12" y1="12" x2="6.99" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2684FF"/>
        <stop offset="1" stopColor="#0052CC"/>
      </linearGradient>
    </defs>
  </svg>
);

/* ── Data ─────────────────────────────────────────────────────────────────── */

const ROW_1: IntegrationLogo[] = [
  { name: 'Google Workspace', svg: <GoogleWorkspaceSvg /> },
  { name: 'Slack',            svg: <SlackSvg /> },
  { name: 'Microsoft Teams',  svg: <MicrosoftTeamsSvg /> },
  { name: 'Zendesk',          svg: <ZendeskSvg /> },
  { name: 'GitHub',           svg: <GithubSvg /> },
  { name: 'Salesforce',       svg: <SalesforceSvg /> },
  { name: 'Notion',           svg: <NotionSvg /> },
];

const ROW_2: IntegrationLogo[] = [
  { name: 'HubSpot',  svg: <HubspotSvg /> },
  { name: 'Zoom',     svg: <ZoomSvg /> },
  { name: 'Stripe',   svg: <StripeSvg /> },
  { name: 'Twilio',   svg: <TwilioSvg /> },
  { name: 'LinkedIn', svg: <LinkedInSvg /> },
  { name: 'Shopify',  svg: <ShopifySvg /> },
  { name: 'Outlook',  svg: <OutlookSvg /> },
  { name: 'Asana',    svg: <AsanaSvg /> },
  { name: 'Jira',     svg: <JiraSvg /> },
];

/* ── Sub-components ───────────────────────────────────────────────────────── */

function LogoCard({ logo }: { logo: IntegrationLogo }) {
  return (
    <div className="integration-logo-card flex flex-col items-center gap-2 px-5 py-4 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm cursor-default select-none min-w-[96px]">
      <span className="text-foreground/80">{logo.svg}</span>
      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{logo.name}</span>
    </div>
  );
}

function MarqueeRow({ logos, reverse = false }: { logos: IntegrationLogo[]; reverse?: boolean }) {
  // Duplicate items so the loop is seamless
  const doubled = [...logos, ...logos];
  return (
    <div className="marquee-wrap py-2">
      <div className={reverse ? 'marquee-track-reverse' : 'marquee-track'}>
        {doubled.map((logo, i) => (
          <div key={`${logo.name}-${i}`} className="mx-3">
            <LogoCard logo={logo} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */

export function IntegrationMarquee() {
  return (
    <div className="relative w-full space-y-4">
      <MarqueeRow logos={ROW_1} />
      <MarqueeRow logos={ROW_2} reverse />
    </div>
  );
}
