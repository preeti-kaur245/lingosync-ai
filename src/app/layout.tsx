import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LingoSync AI - AI Subtitles & Video Translation',
  description: 'AI-powered subtitles that translate, style, and sync your content for global audiences instantly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050506] text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
