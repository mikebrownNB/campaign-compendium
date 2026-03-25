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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-body text-base text-text-primary antialiased">
        <div className="relative z-[1] min-h-screen">
          {children}
        </div>
        <DiceRollerDrawer />
      </body>
    </html>
  );
}
