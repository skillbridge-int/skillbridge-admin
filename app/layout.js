import './globals.css';

const BASE = process.env.NEXT_PUBLIC_BASE || '';
export const metadata = {
  title: 'SkillBridge International',
  description: 'SkillBridge International management system',
  icons: { icon: `${BASE}/favicon.png`, apple: `${BASE}/logo.png` },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b3367' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
