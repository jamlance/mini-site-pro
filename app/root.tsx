import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import type { Route } from "./+types/root";
import { useReauthHandler } from "@inkress/app-kit/client";
import appKitStyles from "@inkress/app-kit/styles.css?url";
// Self-hosted fonts (bundled — no runtime CDN dependency, reliable inside the
// embedded iframe, and not render-blocking the way the Google Fonts link was).
import bricolageFont from "@fontsource-variable/bricolage-grotesque/index.css?url";
import hankenFont from "@fontsource-variable/hanken-grotesk/index.css?url";
import styles from "./styles.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: bricolageFont },
  { rel: "stylesheet", href: hankenFont },
  { rel: "stylesheet", href: appKitStyles },
  { rel: "stylesheet", href: styles },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const reconnecting = useReauthHandler();
  const error = useRouteError();
  // Embedded in the dashboard, recovering a session.
  if (reconnecting) {
    return (
      <main className="bv-shell">
        <div className="bv-empty">
          <span className="bv-spin" />
          <p className="bv-muted">Reconnecting…</p>
        </div>
      </main>
    );
  }
  // 401 on a top-level page = opened the editor URL directly. The builder runs
  // inside your Inkress dashboard; say so clearly instead of spinning forever.
  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <main className="mk-gate">
        <div className="mk-gate-card">
          <div className="mk-gate-mark" aria-hidden>◫</div>
          <h1>Open this from your Inkress dashboard</h1>
          <p>The Mini-site builder runs inside your Inkress dashboard, where it knows which store you’re editing. Open Apps → Mini-site Pro to start building.</p>
          <a className="bv-btn primary" href="https://dev.inkress.com/dashboard" target="_top" rel="noopener">Go to dashboard</a>
        </div>
      </main>
    );
  }
  return (
    <main className="mk-gate">
      <div className="mk-gate-card">
        <div className="mk-gate-mark" aria-hidden>!</div>
        <h1>Something went wrong</h1>
        <p>Try reopening the app from your Inkress dashboard.</p>
        <a className="bv-btn primary" href="https://dev.inkress.com/dashboard" target="_top" rel="noopener">Go to dashboard</a>
      </div>
    </main>
  );
}
