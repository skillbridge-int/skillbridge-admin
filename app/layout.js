import './globals.css';

export const metadata = { title: 'SkillBridge Admin', description: 'SkillBridge International management' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
