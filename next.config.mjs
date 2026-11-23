/** @type {import('next').NextConfig} */
// basePath is needed while the site is served at https://skillbridge-int.github.io/skillbridge-admin/
// Remove the basePath line when moving to a custom domain such as app.skillbridge-int.com.
export default {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: '/skillbridge-admin',
};
