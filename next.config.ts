import type { NextConfig } from "next";

// The Supabase project's origin, for images (signed Storage URLs), API calls
// and Realtime's websocket.
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
const supabaseWebsocket = supabaseOrigin.replace(/^https:/, "wss:");

// A static policy rather than a per-request nonce: a nonce would make the
// prebuilt landing and auth pages dynamic, and ThemeScript has to run inline
// before paint, so scripts keep 'unsafe-inline'. Everything else is limited
// to this site and Supabase. Cloudflare's challenge domain is for Turnstile
// (login and signup). 'unsafe-eval' is for the dev server only (React's dev
// tooling). The PDFs built in the browser (@react-pdf/renderer: storyboard,
// previews) compile WebAssembly ('wasm-unsafe-eval', which doesn't allow
// JavaScript eval) and fetch data: URLs they hold (connect-src data:). Sent
// as Report-Only first: violations show in the browser console without
// blocking anything, until the policy is enforced.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `connect-src 'self' data: ${supabaseOrigin} ${supabaseWebsocket}`,
  "frame-src blob: https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The manuscript and story bible PDFs are built in server actions, which
  // read their fonts from public/fonts on disk.
  // public/ isn't bundled with server functions by default, so the project
  // page's function (where those actions run) gets the files explicitly.
  // Keys are globs, so "[[]" is a literal "[": "/projects/[id]" alone would
  // be a character class, and "/projects/*" also matches the projects list.
  outputFileTracingIncludes: {
    "/projects/[[]id]": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
