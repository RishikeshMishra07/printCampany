"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  user: any;
  isMobileOpen?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

type NavItem = { id: string; label: string; link: string; icon: string };
type NavGroup = { section: string; items: NavItem[] };

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, user, isMobileOpen, isCollapsed, toggleCollapse }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true); // Store Department accordion open by default
  const [prodOpen, setProdOpen] = useState(false); // Production Department accordion
  const [adminOpen, setAdminOpen] = useState(false); // User Management accordion

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const deptPath = user?.role === 'user'
    ? (user.department === 'Store' ? 'general'
      : user.department === 'Printing' ? 'printing'
      : user.department === 'Quality Control (QC)' ? 'qc'
      : user.department === 'Dispatch' ? 'dispatch'
      : 'general')
    : '';

  // ── ALL ADMIN ITEMS (flat list inside Store Department) ─────────────
  const adminStoreItems: NavItem[] = [
    { id: 'dashboard',         label: 'Dashboard',          link: '/dashboard',                    icon: '🏠' },
    { id: 'inventory',         label: 'Inventory Overview', link: '/dashboard/inventory',          icon: '📊' },
    { id: 'daily-report',      label: 'Daily Report',       link: '/dashboard/daily-report',       icon: '📅' },
    { id: 'deals',             label: 'Deals & Contracts',  link: '/dashboard/deals',              icon: '🤝' },
    { id: 'wip',               label: 'WIP Tracking',       link: '/dashboard/wip',                icon: '🎨' },
    { id: 'reports-deal',      label: 'Deal Consumption',   link: '/dashboard/reports/deal',       icon: '📉' },
    { id: 'master-data',       label: 'Items',              link: '/dashboard/master-data',        icon: '📦' },
    { id: 'paint-norms',       label: 'Paint Norms',        link: '/dashboard/paint-norms',        icon: '🖌️' },
    { id: 'vendors',           label: 'Vendors',            link: '/dashboard/vendors',            icon: '🏭' },
    { id: 'live-stock',        label: 'Live Stock',         link: '/dashboard/live-stock/general', icon: '📦' },
    { id: 'purchase-requests', label: 'Purchase Requests',  link: '/dashboard/purchase-requests',  icon: '📋' },
    { id: 'material-requests', label: 'Material Requests',  link: '/dashboard/material-requests',  icon: '📥' },
    { id: 'stock-count',       label: 'Physical Count',     link: '/dashboard/stock-count',        icon: '🔢' },
    { id: 'audit',             label: 'Audit Logs',         link: '/dashboard/audit',              icon: '📜' },
    { id: 'pending-approvals', label: 'Pending Inwards',    link: '/dashboard/pending-approvals',  icon: '⏳' },
    { id: 'inward',            label: 'Inward (GRN)',       link: '/dashboard/inward/general',     icon: '📥' },
    { id: 'issue',             label: 'Issue to Prod.',     link: '/dashboard/issue/general',      icon: '🏭' },
    { id: 'outward',           label: 'Dispatch',           link: '/dashboard/outward/general',    icon: '🚛' },
    { id: 'returns',           label: 'Client Returns',     link: '/dashboard/returns',            icon: '↩️' },
    { id: 'challan',           label: 'Gen. Challan',       link: '/dashboard/challan',            icon: '🧾' },
  ];

  // ── ALL ADMIN ITEMS (flat list inside Production Department) ────────
  const adminProdItems: NavItem[] = [
    { id: 'production-bom', label: 'Bill of Materials', link: '/dashboard/production-bom', icon: '📝' },
    { id: 'floor-1', label: 'Floor 1 Work', link: '/dashboard/production/floor-1', icon: '🏭' },
    { id: 'floor-2', label: 'Floor 2 Work', link: '/dashboard/production/floor-2', icon: '🏭' },
    { id: 'floor-3', label: 'Floor 3 Work', link: '/dashboard/production/floor-3', icon: '🏭' },
  ];

  // ── ALL ADMIN ITEMS (User Management) ────────
  const adminDeptItems: NavItem[] = [
    { id: 'admin-users', label: 'Users & Roles', link: '/dashboard/admin', icon: '👥' },
  ];

  // ── USER (STORE) NAV ───────────────────────────────────────────────
  const userNav: NavGroup[] = [
    {
      section: 'MY WORK',
      items: [
        { id: 'live-stock',         label: 'Live Stock',         link: `/dashboard/live-stock/${deptPath}`,  icon: '📦' },
        { id: 'daily-report',       label: 'Daily Report',       link: '/dashboard/daily-report',            icon: '📅' },
        { id: 'wip',                label: 'WIP Board',          link: '/dashboard/wip',                     icon: '🎨' },
      ],
    },
    {
      section: 'TRANSACTIONS',
      items: [
        { id: 'inward',             label: 'Inward (GRN)',       link: `/dashboard/inward/${deptPath}`,      icon: '📥' },
        { id: 'issue',              label: 'Issue to Prod.',     link: `/dashboard/issue/${deptPath}`,       icon: '🏭' },
        { id: 'outward',            label: 'Dispatch',           link: `/dashboard/outward/${deptPath}`,     icon: '🚛' },
        { id: 'returns',            label: 'Client Returns',     link: '/dashboard/returns',                 icon: '↩️' },
      ],
    },
    {
      section: 'TOOLS',
      items: [
        { id: 'paint-calc',         label: 'Paint Calculator',   link: '/dashboard/paint-calc',              icon: '🧮' },
        { id: 'purchase-requests',  label: 'Raise PR',           link: '/dashboard/purchase-requests',       icon: '📋' },
        { id: 'challan',            label: 'Gen. Challan',       link: '/dashboard/challan',                 icon: '🧾' },
        { id: 'stock-count',        label: 'Stock Count',        link: '/dashboard/stock-count',             icon: '🔢' },
      ],
    },
  ];

  const userDept = user?.department || 'Management';

  let nav: NavGroup[] = [];

  if (user?.role !== 'admin') {
    if (userDept === 'Store') {
      nav = userNav;
    } else {
      nav = [
        {
          section: `${userDept.toUpperCase()}`,
          items: [
            { id: 'production-bom', label: 'Bill of Materials', link: '/dashboard/production-bom', icon: '📝' },
            // { id: 'material-requests', label: 'Material Requests', link: '/dashboard/material-requests', icon: '📥' }
          ]
        }
      ];
    }
  }

  const isActive = (item: NavItem) => {
    if (item.link === '/dashboard') return pathname === '/dashboard';
    return pathname === item.link || pathname?.startsWith(item.link + '/');
  };

  const anyStoreItemActive = adminStoreItems.some(item => isActive(item));
  const anyProdItemActive = adminProdItems.some(item => isActive(item));
  const anyAdminItemActive = adminDeptItems.some(item => isActive(item));

  return (
    <div
      className={`h-[calc(100vh-48px)] bg-[var(--bg-top)] border-r border-border flex-shrink-0 flex flex-col transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-[52px]' : 'w-[178px]'
      } ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative z-30 lg:z-10 ${!mounted ? 'transition-none' : ''}`}
    >
      {/* Nav Items */}
      <div className="flex flex-col py-2 overflow-y-auto no-scrollbar flex-1 px-2">

        {/* ── ADMIN: Store Department Accordion ── */}
        {user?.role === 'admin' && (
          <div className="mb-0.5">
            {/* Store Department Header Button */}
            <button
              onClick={() => !isCollapsed && setStoreOpen(o => !o)}
              title={isCollapsed ? 'Store Department' : undefined}
              className={`w-full flex items-center gap-2 px-2 py-2 mb-2 rounded-xl text-left transition-all duration-200 border ${
                anyStoreItemActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card text-foreground border-border hover:bg-muted hover:border-muted-foreground/30 shadow-sm'
              }`}
            >
              <span className="flex-shrink-0 text-[15px] leading-none w-5 text-center drop-shadow-sm">🏪</span>
              {!isCollapsed && (
                <>
                  <span className="text-[10.5px] leading-tight truncate flex-1 font-bold uppercase">
                    Store Dept
                  </span>
                  <div className={`flex items-center justify-center w-[18px] h-[18px] rounded-md ${anyStoreItemActive ? 'bg-black/20' : 'bg-muted-foreground/10'} transition-transform duration-200 ${storeOpen ? 'rotate-90' : ''}`}>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </>
              )}
            </button>

            {/* Collapsible Items */}
            {(storeOpen || isCollapsed) && (
              <div className={`${!isCollapsed ? 'pl-3 border-l border-border/40 ml-3 mt-0.5' : ''}`}>
                {adminStoreItems.map((item) => {
                  const active = isActive(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { router.push(item.link); }}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2 px-2 py-[6px] rounded-lg text-left transition-colors duration-150 ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="flex-shrink-0 text-[13px] leading-none w-4 text-center">{item.icon}</span>
                      {!isCollapsed && (
                        <span className={`text-[11px] leading-tight truncate flex-1 ${active ? 'font-semibold' : ''}`}>
                          {item.label}
                        </span>
                      )}
                      {active && !isCollapsed && (
                        <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN: Production Department Accordion ── */}
        {user?.role === 'admin' && (
          <div className="mb-0.5 mt-2">
            {/* Production Department Header Button */}
            <button
              onClick={() => !isCollapsed && setProdOpen(o => !o)}
              title={isCollapsed ? 'Production Department' : undefined}
              className={`w-full flex items-center gap-2 px-2 py-2 mb-2 rounded-xl text-left transition-all duration-200 border ${
                anyProdItemActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card text-foreground border-border hover:bg-muted hover:border-muted-foreground/30 shadow-sm'
              }`}
            >
              <span className="flex-shrink-0 text-[15px] leading-none w-5 text-center drop-shadow-sm">🏭</span>
              {!isCollapsed && (
                <>
                  <span className="text-[10.5px] leading-tight truncate flex-1 font-bold uppercase">
                    Production
                  </span>
                  <div className={`flex items-center justify-center w-[18px] h-[18px] rounded-md ${anyProdItemActive ? 'bg-black/20' : 'bg-muted-foreground/10'} transition-transform duration-200 ${prodOpen ? 'rotate-90' : ''}`}>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </>
              )}
            </button>

            {/* Collapsible Items */}
            {(prodOpen || isCollapsed) && (
              <div className={`${!isCollapsed ? 'pl-3 border-l border-border/40 ml-3 mt-0.5' : ''}`}>
                {adminProdItems.map((item) => {
                  const active = isActive(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { router.push(item.link); }}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2 px-2 py-[6px] rounded-lg text-left transition-colors duration-150 ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="flex-shrink-0 text-[13px] leading-none w-4 text-center">{item.icon}</span>
                      {!isCollapsed && (
                        <span className={`text-[11px] leading-tight truncate flex-1 ${active ? 'font-semibold' : ''}`}>
                          {item.label}
                        </span>
                      )}
                      {active && !isCollapsed && (
                        <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN: User Management Accordion ── */}
        {user?.role === 'admin' && (
          <div className="mb-0.5 mt-2">
            <button
              onClick={() => !isCollapsed && setAdminOpen(o => !o)}
              title={isCollapsed ? 'User Management' : undefined}
              className={`w-full flex items-center gap-2 px-2 py-2 mb-2 rounded-xl text-left transition-all duration-200 border ${
                anyAdminItemActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card text-foreground border-border hover:bg-muted hover:border-muted-foreground/30 shadow-sm'
              }`}
            >
              <span className="flex-shrink-0 text-[15px] leading-none w-5 text-center drop-shadow-sm">👤</span>
              {!isCollapsed && (
                <>
                  <span className="text-[10.5px] leading-tight truncate flex-1 font-bold uppercase">
                    User Management
                  </span>
                  <div className={`flex items-center justify-center w-[18px] h-[18px] rounded-md ${anyAdminItemActive ? 'bg-black/20' : 'bg-muted-foreground/10'} transition-transform duration-200 ${adminOpen ? 'rotate-90' : ''}`}>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </>
              )}
            </button>

            {(adminOpen || isCollapsed) && (
              <div className={`${!isCollapsed ? 'pl-3 border-l border-border/40 ml-3 mt-0.5' : ''}`}>
                {adminDeptItems.map((item) => {
                  const active = isActive(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { router.push(item.link); }}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2 px-2 py-[6px] rounded-lg text-left transition-colors duration-150 ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="flex-shrink-0 text-[13px] leading-none w-4 text-center">{item.icon}</span>
                      {!isCollapsed && (
                        <span className={`text-[11px] leading-tight truncate flex-1 ${active ? 'font-semibold' : ''}`}>
                          {item.label}
                        </span>
                      )}
                      {active && !isCollapsed && (
                        <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── USER NAV (non-admin) ── */}
        {user?.role !== 'admin' && nav.map((group) => (
          <div key={group.section} className="mb-0.5">
            {/* Section Label */}
            {!isCollapsed && (
              <div className="px-2 pt-3 pb-0.5 text-[9px] font-bold tracking-widest uppercase select-none text-muted-foreground/50">
                {group.section}
              </div>
            )}
            {isCollapsed && <div className="my-1.5 border-t border-border/30" />}

            {/* Nav Buttons */}
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => { router.push(item.link); }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-lg text-left transition-colors duration-150 ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex-shrink-0 text-[13px] leading-none w-4 text-center">{item.icon}</span>
                  {!isCollapsed && (
                    <span className={`text-[11.5px] leading-tight truncate flex-1 ${active ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                  )}
                  {active && !isCollapsed && (
                    <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="flex items-center justify-center p-3 border-t border-border/50 flex-shrink-0">
        <button
          className="flex items-center justify-center w-7 h-7 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all bg-transparent"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
