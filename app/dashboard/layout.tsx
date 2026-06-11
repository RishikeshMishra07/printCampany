"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

import { AppProvider } from '@/context/AppContext';
import { AppProvider as PolarisProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>({ name: 'Loading...', role: 'user', initials: '?' });

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setSidebarCollapsed(saved === 'true');
    setMounted(true);

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) {
          const u = d.user;
          setUser({ ...u, initials: (u.name || u.username || 'U').substring(0, 2).toUpperCase() });
        }
      })
      .catch(console.error);
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const activePage = pathname === '/dashboard' ? 'dashboard' : pathname.split('/').pop() || 'dashboard';

  return (
    <AppProvider>
      <PolarisProvider i18n={enTranslations}>
        <div id="sc-app" className="w-full h-screen fixed inset-0">
          <div className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground">
            <Topbar 
              user={user} 
              activePage={activePage} 
              logout={() => { router.push('/'); }} 
              toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
              toggleSidebar={toggleSidebar}
            />
            <div className="flex flex-1 overflow-hidden">
              {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/70 z-20 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
              )}
              <Sidebar 
                activePage={activePage} 
                setActivePage={(p) => router.push(`/dashboard/${p === 'dashboard' ? '' : p}`)} 
                user={user} 
                isMobileOpen={mobileMenuOpen} 
                isCollapsed={sidebarCollapsed}
                toggleCollapse={toggleSidebar}
              />
              <div className="flex-1 flex flex-col overflow-hidden">
                {children}
              </div>
            </div>
          </div>
        </div>
      </PolarisProvider>
    </AppProvider>
  );
}
