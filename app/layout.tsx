import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { DiceRollerDrawer } from '@/components/DiceRollerDrawer';

export const metadata: Metadata = {
  title: 'Campaign Compendium',
  description: 'Multi-campaign TTRPG dossier platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body text-text-primary antialiased">
        <div className="relative z-[1] min-h-screen">
          {children}
        </div>
        <DiceRollerDrawer />
      </body>
    </html>
  );
}
