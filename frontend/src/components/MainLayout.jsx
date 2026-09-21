import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import VpnStatusBanner from './VpnStatusBanner';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <VpnStatusBanner />
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
