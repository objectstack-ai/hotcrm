import './global.css';

// Root layout is a pass-through: the real <html>/<body> and providers live in
// `app/[lang]/layout.tsx` so the `lang` attribute and UI translations are
// locale-aware. Route handlers (api, og, llms) don't need a layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
