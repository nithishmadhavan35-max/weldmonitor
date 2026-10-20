import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Map,
  CheckCircle2,
  BarChart3,
  Clock,
  Wrench,
  Bell,
  FileText,
  SlidersHorizontal,
  ShieldAlert,
  ChevronLeft,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_SECTIONS = [
  {
    label: 'Monitor',
    items: [
      { to: '/',               label: 'Overview',          icon: LayoutDashboard },
      { to: '/machines',       label: 'Machines',          icon: Cpu },
      { to: '/factory-floor',  label: 'Factory Floor',     icon: Map },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/quality',        label: 'Quality',           icon: CheckCircle2 },
      { to: '/production',     label: 'Production',        icon: BarChart3 },
      { to: '/downtime',       label: 'Downtime',          icon: Clock },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/maintenance',    label: 'Maintenance',       icon: Wrench },
      { to: '/alerts',         label: 'Alerts & Faults',   icon: Bell,      alert: true },
      { to: '/reports',        label: 'Reports',           icon: FileText,  roles: ['ADMIN', 'PRODUCTION_MANAGER', 'MAINTENANCE_ENGINEER'] },
      { to: '/simulation',     label: 'Simulator',         icon: SlidersHorizontal },
      { to: '/admin',          label: 'Administration',    icon: ShieldAlert, adminOnly: true },
    ],
  },
];

const roleLabels = {
  ADMIN:                'Administrator',
  OPERATOR:             'Welding Operator',
  MAINTENANCE_ENGINEER: 'Maintenance Eng.',
  PRODUCTION_MANAGER:   'Production Mgr.',
};

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, isAdmin, logout } = useAuth();

  const isVisible = (item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.roles && user && !item.roles.includes(user.role)) return false;
    return true;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-overlay visible lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile close button row only (if open on mobile screen) */}
        <div className="lg:hidden flex items-center justify-between px-4 h-12 border-b border-slate-200 flex-shrink-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            aria-label="Close navigation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(isVisible);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="sidebar-section-label">{section.label}</div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `sidebar-nav-item ${isActive ? 'active' : ''}`
                      }
                    >
                      <Icon className="nav-icon w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.alert && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-danger animate-pulse flex-shrink-0" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Profile area pinned at bottom */}
        {user && (
          <div className="flex-shrink-0 border-t border-slate-200 p-3 bg-white mt-auto">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 transition-colors">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-xs font-bold">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              {/* Name & role */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                  {user.name?.split('(')[0]?.trim() || user.name}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 truncate leading-tight">
                  {roleLabels[user.role] || user.role}
                </p>
              </div>
              {/* Sign out */}
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
