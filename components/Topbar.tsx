"use client";
import React, { useState, useEffect } from 'react';
import { FiClock } from 'react-icons/fi';

interface TopbarProps {
  user: any;
  activePage: string;
  logout: () => void;
  toggleMobileMenu?: () => void;
  toggleSidebar?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ user, activePage, logout, toggleMobileMenu, toggleSidebar }) => {
  const [time, setTime] = useState('--:--:--');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`/api/notifications?requesterId=${user?.id || ''}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) { }
  };

  useEffect(() => {
    // Check local storage for theme
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const intervalTime = setInterval(updateTime, 1000);

    fetchNotifs();
    const intervalNotif = setInterval(fetchNotifs, 30000);

    return () => {
      clearInterval(intervalTime);
      clearInterval(intervalNotif);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const clearNotifs = async () => {
    try {
      await fetch(`/api/notifications?requesterId=${user?.id || ''}`, { method: 'DELETE' });
      setNotifications([]);
      setShowNotifs(false);
    } catch (e) { }
  };

  return (
    <div className="sticky top-0 flex items-center justify-between px-4 h-12 bg-[var(--bg-top)] border-b border-border flex-shrink-0 w-full z-50">
      <div className="flex items-center gap-3 text-sm font-bold text-foreground">
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer hidden lg:flex items-center justify-center"
            title="Toggle Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        {toggleMobileMenu && (
          <button
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer flex lg:hidden items-center justify-center"
            onClick={toggleMobileMenu}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <span className="font-bold tracking-tight text-foreground truncate hidden sm:inline-block">AutoPrint Workshop</span>
        <span className="font-bold tracking-tight text-foreground truncate sm:hidden">AutoPrint</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="px-2 py-1.5 border border-border rounded-md text-xs font-semibold text-foreground bg-muted transition-all cursor-pointer relative flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Notification</span>
            <span className="sm:hidden">Notifs</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[9px] px-1 py-0.5 rounded-full font-bold border border-background leading-none">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute top-[calc(100%+12px)] -right-16 sm:right-0 w-[320px] sm:w-[380px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-visible animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Pointer Arrow */}
              <div className="absolute -top-1.5 right-[75px] sm:right-[30px] w-2.5 h-2.5 bg-card border-l border-t border-border rotate-45 z-10" />
              
              <div className="relative z-20 flex flex-col rounded-xl overflow-hidden bg-card">
                <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/40">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  <button onClick={clearNotifs} className="text-[10px] text-destructive hover:underline bg-transparent border-none cursor-pointer font-medium">Clear All</button>
                </div>
                <div className="max-h-[350px] overflow-y-auto divide-y divide-border/20">
                  {notifications.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                      </svg>
                      <span className="text-xs font-medium">No new notifications</span>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <span className="font-semibold text-primary text-xs truncate">{n.title}</span>
                            <span className="text-[9px] text-muted-foreground whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-foreground leading-snug line-clamp-2" title={n.message}>{n.message}</p>
                          <span className="text-muted-foreground font-mono text-[9px] mt-1">Ref: {n.account}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>



        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shadow-sm">
          <FiClock size={12} className="text-orange-500" />
          {time}
        </div>

        <div className="relative">
          <div
            onClick={() => setShowProfile(!showProfile)}
            className={`flex items-center justify-center cursor-pointer w-8 h-8 rounded-full border transition-all ${showProfile ? 'border-primary bg-muted' : 'border-transparent bg-card'
              }`}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-[9px] font-bold shadow-sm">
              {user?.initials || user?.name?.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase() || '--'}
            </div>
          </div>

          {showProfile && (
            <div className="absolute top-[calc(100%+12px)] right-0 w-[160px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-visible animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Pointer Arrow */}
              <div className="absolute -top-1.5 right-[18px] w-2.5 h-2.5 bg-card border-l border-t border-border rotate-45 z-10" />

              <div className="relative z-20 rounded-xl overflow-hidden bg-card flex flex-col p-1.5">
                {/* User Info Header */}
                <div className="flex flex-col min-w-0 px-2.5 py-2 mb-1 border-b border-border/50 gap-1">
                  <span className="text-xs font-bold text-foreground truncate">
                    {user?.name || 'System Admin'}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {user?.email || 'admin@dr.com'}
                  </span>
                  {(user?.empId || user?.employee_code || user?.employeeId) && (
                    <span className="text-[10px] text-muted-foreground truncate font-mono">
                      ID: {user?.empId || user?.employee_code || user?.employeeId}
                    </span>
                  )}
                  <div>
                    <span className="bg-primary/10 text-primary text-[8px] px-1.5 py-0.5 rounded border border-primary/20 font-bold uppercase tracking-wider">
                      {user?.role || 'Admin'}
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <button
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-destructive hover:bg-destructive/10 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  onClick={() => {
                    if (confirm('Are you sure you want to logout?')) {
                      logout();
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
