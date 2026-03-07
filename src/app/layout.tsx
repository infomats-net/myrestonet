import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { PwaManager } from '@/components/pwa-manager';
import { PwaInstallBanner } from '@/components/pwa-install-banner';

export const metadata: Metadata = {
  title: 'MyRestoNet | Global Restaurant Ecosystem',
  description: 'High-performance global restaurant management platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyRestoNet',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <FirebaseClientProvider>
          <PwaManager />
          {children}
          <PwaInstallBanner />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
