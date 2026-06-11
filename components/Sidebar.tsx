"use client";
import React, { useState, useEffect } from 'react';
import { ButtonGroup, Button } from '@shopify/polaris';
import { LayoutGrid, Users, Phone, UploadCloud, BarChart2, Settings, LineChart, Database } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  user: any;
  isMobileOpen?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, user, isMobileOpen, isCollapsed, toggleCollapse }) => {
  const [mounted, setMounted] = useState(false);

  // Use a small timeout to ensure the state is applied before enabling transitions
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const deptPath = user?.role === 'user'
    ? (user.department === 'Printing' ? 'printing' : user.department === 'Quality Control (QC)' ? 'qc' : user.department === 'Dispatch' ? 'dispatch' : 'general')
    : '';

  const navItems = [
    {
      id: 'dashboard', 
      label: 'Dashboard', 
      section: 'OPERATIONS', 
      link: user?.role === 'user' ? `/dashboard/${deptPath}` : '/dashboard',
      Icon: LayoutGrid, 
      color: 'text-blue-500'
    },
    {
      id: 'live-records', 
      label: 'Live Records', 
      section: 'OPERATIONS', 
      hasDot: true, 
      link: user?.role === 'user' ? `/dashboard/live-records/${deptPath}` : '/dashboard/live-records',
      Icon: Users, 
      color: 'text-green-500'
    },
    {
      id: 'upload', 
      label: 'Upload Data', 
      section: 'MANAGEMENT', 
      roles: ['admin', 'user'], 
      link: user?.role === 'user' ? `/dashboard/upload/${deptPath}` : '/dashboard/upload',
      Icon: UploadCloud, 
      color: 'text-purple-500'
    },
    {
      id: 'duplicate', 
      label: 'Duplicate Records', 
      section: 'MANAGEMENT', 
      link: user?.role === 'user' ? `/dashboard/duplicate/${deptPath}` : '/dashboard/duplicate',
      Icon: Users, 
      color: 'text-amber-500'
    },
    {
      id: 'record-list', 
      label: 'Record List', 
      section: 'MANAGEMENT', 
      link: user?.role === 'user' ? `/dashboard/record-list/${deptPath}` : '/dashboard/record-list',
      Icon: Database, 
      color: 'text-blue-500'
    },
    {
      id: 'admin', 
      label: 'Admin Panel', 
      section: 'MANAGEMENT', 
      roles: ['admin'], 
      link: '/dashboard/admin',
      Icon: Settings, 
      color: 'text-indigo-500'
    },
    {
      id: 'audit', 
      label: 'Audit Logs', 
      section: 'MANAGEMENT', 
      roles: ['admin'], 
      link: '/dashboard/audit',
      Icon: LineChart, 
      color: 'text-rose-500'
    }
  ];

  const sections = ['OPERATIONS', 'MANAGEMENT'];

  return (
    <div 
      className={`h-[calc(100vh-48px)] bg-[var(--bg-top)] border-r border-border flex-shrink-0 flex flex-col transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-[60px]' : 'w-[160px]'
      } ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative z-30 lg:z-10 ${!mounted ? 'transition-none' : ''}`}
    >
      <div className="flex flex-col items-stretch gap-2 py-4 overflow-y-auto no-scrollbar flex-1 px-2 w-full">
        {navItems.filter(i => (!i.roles || i.roles.includes(user?.role))).map((item, index) => {
          const isActive = activePage === item.id;
          const Icon = item.Icon;
          return (
            <Button
              key={item.id}
              pressed={isActive}
              fullWidth
              textAlign="left"
              icon={<span className={item.color}><Icon size={16} strokeWidth={2.5} style={{ fill: 'none' }} /></span>}
              onClick={() => {
                if (item.link) {
                  window.location.href = item.link;
                } else {
                  setActivePage(item.id);
                }
              }}
            >
              {isCollapsed ? '' : item.label}
            </Button>
          );
        })}
      </div>

      {/* Spacer pushes toggle to bottom */}
      <div className="flex-1" />

      {/* Bottom toggle button */}
      <div className="flex items-center justify-center p-3 border-t border-border/50">
        <button 
          className="flex items-center justify-center w-7 h-7 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer bg-transparent" 
          onClick={toggleCollapse} 
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
