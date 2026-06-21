import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hydrone — Persistent-State Graph RPG',
  description:
    'LLM-driven interactive fiction with a deterministic engine and long-term memory.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-200 antialiased">
        <div className="crt-overlay" />
        {children}
      </body>
    </html>
  );
}
