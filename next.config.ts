import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
