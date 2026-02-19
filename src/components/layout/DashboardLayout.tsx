import { type ReactNode } from 'react';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-sage-50">
      <Header />
      <main>
        {children}
      </main>
    </div>
  );
}
