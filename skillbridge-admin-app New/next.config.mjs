/** @type {import('next').NextConfig} */
// BASE is needed while the site is served at https://skillbridge-int.github.io/skillbridge-admin/
// For a custom domain such as app.skillbridge-int.com set BASE to '' (empty).
const BASE = '/skillbridge-admin';
export default {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: BASE,
  env: { NEXT_PUBLIC_BASE: BASE },
};
