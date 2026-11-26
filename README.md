# SkillBridge Admin (Next.js + Supabase)
Local run: npm install, copy .env.production to .env.local, npm run dev.
Deploy: push to a PRIVATE GitHub repo, import in Vercel (framework: Next.js, root directory: this folder).
Env vars are in .env.production (public anon values only). Never add the service_role key.

## Install as an app
`public/manifest.webmanifest` makes the site installable (Chrome: menu > Cast, save and share > Install page as app).
If you move to a custom domain (BASE = ''), change `start_url`, `scope` and the icon paths in the manifest to start with `/` instead of `/skillbridge-admin/`.
