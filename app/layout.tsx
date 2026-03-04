import type { Metadata } from 'next';
import '../src/styles/global.css';

export const metadata: Metadata = {
  title: 'Partnership Deed Generator',
  description: 'AI-powered Indian Partnership Deed Generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
